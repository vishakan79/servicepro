package com.fieldservicely.security;

import com.fieldservicely.config.AppProperties;
import com.fieldservicely.entity.Role;
import com.fieldservicely.entity.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import javax.crypto.SecretKey;
import org.springframework.stereotype.Service;

@Service
public class JwtService {

    private final SecretKey key;
    private final AppProperties props;

    public JwtService(AppProperties props) {
        byte[] secret = props.jwt().secret().getBytes(StandardCharsets.UTF_8);
        if (secret.length < 32) {
            throw new IllegalStateException("app.jwt.secret must be at least 32 bytes (set JWT_SECRET)");
        }
        this.key = Keys.hmacShaKeyFor(secret);
        this.props = props;
    }

    public String createAccessToken(User user) {
        Instant now = Instant.now();
        return Jwts.builder()
                .issuer(props.jwt().issuer())
                .subject(String.valueOf(user.getId()))
                .claim("name", user.getName())
                .claim("email", user.getEmail())
                .claim("role", user.getRole().name())
                .claim("cid", user.getCustomerId())
                .claim("tid", user.getTechnicianId())
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(props.jwt().accessTtl())))
                .signWith(key)
                .compact();
    }

    /** @throws JwtException if the token is malformed, expired, or not signed by us */
    public AuthUser parse(String token) {
        Claims c = Jwts.parser()
                .verifyWith(key)
                .requireIssuer(props.jwt().issuer())
                .build()
                .parseSignedClaims(token)
                .getPayload();
        return new AuthUser(
                Long.valueOf(c.getSubject()),
                c.get("name", String.class),
                c.get("email", String.class),
                Role.valueOf(c.get("role", String.class)),
                asLong(c.get("cid")),
                asLong(c.get("tid")));
    }

    private String proofIssuer() { return props.jwt().issuer() + "-email-proof"; }

    /** A short-lived proof that the holder controls `email` (issued after the emailed code was entered). Not usable as an access token. */
    public String createEmailProof(String email) {
        Instant now = Instant.now();
        return Jwts.builder().issuer(proofIssuer()).subject(email).claim("purpose", "email-proof")
                .issuedAt(Date.from(now)).expiration(Date.from(now.plusSeconds(30 * 60))).signWith(key).compact();
    }

    /** @return the proven email address, or null when the token is not a valid, unexpired email proof */
    public String parseEmailProof(String token) {
        try {
            Claims c = Jwts.parser().verifyWith(key).requireIssuer(proofIssuer()).build().parseSignedClaims(token).getPayload();
            return "email-proof".equals(c.get("purpose", String.class)) ? c.getSubject() : null;
        } catch (JwtException | IllegalArgumentException e) {
            return null;
        }
    }

    public long accessTtlSeconds() {
        return props.jwt().accessTtl().toSeconds();
    }

    private static Long asLong(Object o) {
        return o instanceof Number n ? n.longValue() : null;
    }
}
