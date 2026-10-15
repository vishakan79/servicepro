package com.fieldservicely.security;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fieldservicely.config.AppProperties;
import com.fieldservicely.exception.ApiException;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwsHeader;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.LocatorAdapter;
import java.io.ByteArrayInputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.security.PublicKey;
import java.security.cert.CertificateFactory;
import java.security.cert.X509Certificate;
import java.time.Duration;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

/**
 * Verifies Firebase Auth ID tokens that prove ownership of a phone number (Firebase texted and checked the SMS code in the browser)
 * or of an email address (Firebase emailed a sign-in link and the person opened it).
 * Checks the RS256 signature against Google's published keys, issuer, audience (our project), expiry, sign-in provider
 * and that the sign-in happened in the last few minutes, so an old captured token cannot be replayed.
 */
@Service
public class FirebaseTokenVerifier {

    private static final Logger log = LoggerFactory.getLogger(FirebaseTokenVerifier.class);
    private static final String CERT_URL = "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";
    private static final Duration PHONE_MAX_AGE = Duration.ofMinutes(5);
    // The email proof is a link the person opens in their mailbox and then comes back, so it may be older than an SMS proof.
    private static final Duration EMAIL_MAX_AGE = Duration.ofMinutes(30);
    private static final Pattern MAX_AGE = Pattern.compile("max-age=(\\d+)");
    private static final String FAILED = "Mobile verification failed. Request a new code and try again.";

    private final AppProperties props;
    private final ObjectMapper mapper;
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();

    private volatile Map<String, PublicKey> keys = Map.of();
    private volatile Instant keysExpire = Instant.EPOCH;
    private volatile Instant lastForcedRefresh = Instant.EPOCH;

    public FirebaseTokenVerifier(AppProperties props, ObjectMapper mapper) {
        this.props = props;
        this.mapper = mapper;
    }

    /** @return the verified phone number in E.164 form */
    public String verifyPhone(String idToken) {
        Claims c = parse(idToken);
        String phone = c.get("phone_number", String.class);
        if (phone == null || phone.isBlank() || !"phone".equals(provider(c)) || !fresh(c, PHONE_MAX_AGE)) {
            log.warn("Rejected Firebase phone token: missing phone claim, wrong provider or stale auth_time");
            throw new ApiException.Unauthorized(FAILED);
        }
        return phone;
    }

    /** @return the verified email address, lower-cased */
    public String verifyEmail(String idToken) {
        Claims c = parse(idToken);
        String email = c.get("email", String.class);
        boolean verified = Boolean.TRUE.equals(c.get("email_verified", Boolean.class));
        if (email == null || email.isBlank() || !verified || "phone".equals(provider(c)) || !fresh(c, EMAIL_MAX_AGE)) {
            log.warn("Rejected Firebase email token: missing or unverified email claim, wrong provider or stale auth_time");
            throw new ApiException.Unauthorized("Email verification failed. Request a new link and try again.");
        }
        return email.trim().toLowerCase();
    }

    private Claims parse(String idToken) {
        String projectId = props.firebase().projectId();
        if (projectId == null || projectId.isBlank()) {
            throw new ApiException.BadRequest("Verification is not configured on the server");
        }
        if (idToken == null || idToken.isBlank()) throw new ApiException.Unauthorized(FAILED);
        try {
            Claims c = Jwts.parser()
                    .keyLocator(new LocatorAdapter<Key>() {
                        @Override
                        protected Key locate(JwsHeader header) {
                            return keyFor(header.getKeyId());
                        }
                    })
                    .requireIssuer("https://securetoken.google.com/" + projectId)
                    .requireAudience(projectId)
                    .clockSkewSeconds(60)
                    .build()
                    .parseSignedClaims(idToken)
                    .getPayload();
            if (c.getSubject() == null || c.getSubject().isBlank()) throw new JwtException("no subject");
            return c;
        } catch (ApiException e) {
            throw e;
        } catch (JwtException | IllegalArgumentException e) {
            log.warn("Rejected Firebase token: {}", e.getMessage());
            throw new ApiException.Unauthorized(FAILED);
        }
    }

    private static String provider(Claims c) {
        Object firebase = c.get("firebase");
        return firebase instanceof Map<?, ?> m && m.get("sign_in_provider") instanceof String s ? s : "";
    }

    private static boolean fresh(Claims c, Duration maxAge) {
        Object authTime = c.get("auth_time");
        return authTime instanceof Number n && Instant.ofEpochSecond(n.longValue()).isAfter(Instant.now().minus(maxAge));
    }

    private Key keyFor(String kid) {
        if (kid == null) throw new JwtException("token has no key id");
        PublicKey key = currentKeys(false).get(kid);
        if (key == null) key = currentKeys(true).get(kid);
        if (key == null) throw new JwtException("unknown signing key");
        return key;
    }

    private synchronized Map<String, PublicKey> currentKeys(boolean force) {
        Instant now = Instant.now();
        if (force) {
            if (lastForcedRefresh.isAfter(now.minusSeconds(60))) return keys; // at most one forced refresh a minute
            lastForcedRefresh = now;
        } else if (now.isBefore(keysExpire) && !keys.isEmpty()) {
            return keys;
        }
        try {
            HttpRequest req = HttpRequest.newBuilder(URI.create(CERT_URL)).timeout(Duration.ofSeconds(5)).GET().build();
            HttpResponse<String> res = http.send(req, HttpResponse.BodyHandlers.ofString());
            if (res.statusCode() != 200) throw new IllegalStateException("HTTP " + res.statusCode());
            Map<String, String> pems = mapper.readValue(res.body(), new TypeReference<Map<String, String>>() {});
            CertificateFactory cf = CertificateFactory.getInstance("X.509");
            Map<String, PublicKey> fresh = new HashMap<>();
            for (Map.Entry<String, String> e : pems.entrySet()) {
                X509Certificate cert = (X509Certificate) cf.generateCertificate(
                        new ByteArrayInputStream(e.getValue().getBytes(StandardCharsets.UTF_8)));
                fresh.put(e.getKey(), cert.getPublicKey());
            }
            long maxAge = res.headers().firstValue("Cache-Control").map(h -> {
                Matcher m = MAX_AGE.matcher(h);
                return m.find() ? Long.parseLong(m.group(1)) : 3600L;
            }).orElse(3600L);
            keys = Map.copyOf(fresh);
            keysExpire = now.plusSeconds(Math.max(60, maxAge));
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            if (keys.isEmpty()) throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "Mobile verification is temporarily unavailable");
        } catch (Exception e) {
            log.error("Could not load Firebase signing keys: {}", e.getMessage());
            if (keys.isEmpty()) throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "Mobile verification is temporarily unavailable");
        }
        return keys;
    }
}
