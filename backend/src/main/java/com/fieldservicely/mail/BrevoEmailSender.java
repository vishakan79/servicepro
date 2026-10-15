package com.fieldservicely.mail;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fieldservicely.config.AppProperties;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.stereotype.Component;

/**
 * Sends mail through Brevo's HTTPS API (port 443). Use it where outbound SMTP is blocked, e.g. Render's free web services.
 * The sender address (MAIL_FROM) must be verified in the Brevo account. The API key is never logged.
 */
@Component
@ConditionalOnExpression("'${app.mail.enabled:false}' == 'true' and '${app.mail.provider:smtp}' == 'brevo'")
public class BrevoEmailSender implements EmailSender {

    private static final URI ENDPOINT = URI.create("https://api.brevo.com/v3/smtp/email");

    private final AppProperties props;
    private final ObjectMapper mapper;
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();

    public BrevoEmailSender(AppProperties props, ObjectMapper mapper) {
        this.props = props;
        this.mapper = mapper;
    }

    @Override
    public void send(String to, String subject, String body) {
        try {
            String json = mapper.writeValueAsString(Map.of(
                    "sender", Map.of("name", "ServicePro", "email", props.mail().from()),
                    "to", List.of(Map.of("email", to)),
                    "subject", subject,
                    "textContent", body));
            HttpRequest req = HttpRequest.newBuilder(ENDPOINT)
                    .timeout(Duration.ofSeconds(10))
                    .header("api-key", props.mail().brevoApiKey())
                    .header("Content-Type", "application/json")
                    .header("Accept", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(json))
                    .build();
            HttpResponse<String> res = http.send(req, HttpResponse.BodyHandlers.ofString());
            if (res.statusCode() / 100 != 2) {
                throw new IllegalStateException("Brevo rejected the email (HTTP " + res.statusCode() + "): check BREVO_API_KEY and that MAIL_FROM is a verified sender");
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Email sending was interrupted", e);
        } catch (java.io.IOException e) {
            throw new IllegalStateException("Could not reach the Brevo email API: " + e.getClass().getSimpleName(), e);
        }
    }
}
