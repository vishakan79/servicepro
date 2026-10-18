package com.fieldservicely.security;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fieldservicely.config.AppProperties;
import com.fieldservicely.exception.ApiException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

/**
 * Verifies a Supabase Auth access token that proves ownership of an email address (Supabase mailed a one-time code or link
 * and the person confirmed it). Instead of handling signing keys here, the token is asked about itself: Supabase's own
 * /auth/v1/user endpoint accepts only valid, unexpired tokens and returns the confirmed email. The sign-in must be recent,
 * so an old captured token cannot be replayed.
 */
@Service
public class SupabaseEmailVerifier {

    private static final Logger log = LoggerFactory.getLogger(SupabaseEmailVerifier.class);
    private static final Duration MAX_AGE = Duration.ofMinutes(30);
    private static final String FAILED = "Email verification failed. Request a new code and try again.";

    private final AppProperties props;
    private final ObjectMapper mapper;
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();

    public SupabaseEmailVerifier(AppProperties props, ObjectMapper mapper) {
        this.props = props;
        this.mapper = mapper;
    }

    /** @return the verified email address, lower-cased */
    public String verifyEmail(String accessToken) {
        AppProperties.Supabase cfg = props.supabase();
        if (cfg == null || cfg.url() == null || cfg.url().isBlank() || cfg.anonKey() == null || cfg.anonKey().isBlank()) {
            throw new ApiException.BadRequest("Verification is not configured on the server");
        }
        if (accessToken == null || accessToken.isBlank()) throw new ApiException.Unauthorized(FAILED);
        try {
            String base = cfg.url().endsWith("/") ? cfg.url().substring(0, cfg.url().length() - 1) : cfg.url();
            HttpRequest req = HttpRequest.newBuilder(URI.create(base + "/auth/v1/user"))
                    .timeout(Duration.ofSeconds(8))
                    .header("apikey", cfg.anonKey())
                    .header("Authorization", "Bearer " + accessToken)
                    .GET().build();
            HttpResponse<String> res = http.send(req, HttpResponse.BodyHandlers.ofString());
            if (res.statusCode() == 401 || res.statusCode() == 403) {
                log.warn("Rejected Supabase token: HTTP {}", res.statusCode());
                throw new ApiException.Unauthorized(FAILED);
            }
            if (res.statusCode() != 200) throw new IllegalStateException("HTTP " + res.statusCode());
            JsonNode u = mapper.readTree(res.body());
            String email = u.path("email").asText("");
            boolean confirmed = !u.path("email_confirmed_at").asText("").isBlank() || !u.path("confirmed_at").asText("").isBlank();
            String last = u.path("last_sign_in_at").asText("");
            boolean fresh = !last.isBlank() && Instant.parse(last).isAfter(Instant.now().minus(MAX_AGE));
            if (email.isBlank() || !confirmed || !fresh) {
                log.warn("Rejected Supabase token: missing email, unconfirmed email or stale sign-in");
                throw new ApiException.Unauthorized(FAILED);
            }
            return email.trim().toLowerCase();
        } catch (ApiException e) {
            throw e;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "Email verification is temporarily unavailable");
        } catch (Exception e) {
            log.error("Could not verify Supabase token: {}", e.getMessage());
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "Email verification is temporarily unavailable");
        }
    }
}
