package com.fieldservicely.config;

import jakarta.annotation.PostConstruct;
import java.nio.charset.StandardCharsets;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

/** Refuses to boot in production with a weak JWT secret or without the Firebase project that verifies registrations. */
@Component
@Profile("prod")
public class ProdSafetyCheck {
    private final AppProperties props;

    public ProdSafetyCheck(AppProperties props) {
        this.props = props;
    }

    @PostConstruct
    void verify() {
        String s = props.jwt().secret();
        if (s == null || s.startsWith("dev-only") || s.getBytes(StandardCharsets.UTF_8).length < 32) {
            throw new IllegalStateException("JWT_SECRET must be set to a random value of at least 32 bytes in production");
        }
        if (props.firebase().projectId() == null || props.firebase().projectId().isBlank()) {
            throw new IllegalStateException("FIREBASE_PROJECT_ID is required in production to verify mobile and email proofs");
        }
    }
}
