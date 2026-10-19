package com.fieldservicely.config;

import java.time.Duration;
import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;

/** Typed view of the `app.*` settings (see application.yml). */
@ConfigurationProperties(prefix = "app")
public record AppProperties(String zone, Jwt jwt, Security security, Cors cors, Sla sla, Mail mail, Redis redis, Firebase firebase,
                            Bootstrap bootstrap) {

    public record Jwt(String secret, String issuer, Duration accessTtl, Duration refreshTtl) {}

    /** Refresh cookie flags and brute-force limits (failed sign-ins and registration attempts use the same limiter). */
    public record Security(boolean secureCookies, int loginMaxAttempts, Duration loginWindow) {}

    public record Cors(List<String> allowedOrigins) {}

    public record Sla(long checkMs) {}

    /** provider: "smtp" (MAIL_HOST...) or "brevo" (HTTPS API, for hosts that block SMTP such as Render's free plan). */
    public record Mail(boolean enabled, String from, String provider, String brevoApiKey) {}

    public record Redis(boolean enabled) {}

    /** Firebase project whose phone and email-link ID tokens this server accepts. */
    public record Firebase(String projectId) {}

    /** The first ADMIN, created at startup when missing. adminPassword is hashed with BCrypt; it is never logged. */
    public record Bootstrap(String adminName, String adminEmail, String adminPhone, String adminPassword) {}
}
