package com.fieldservicely.config;

import java.util.Arrays;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

/**
 * Logs, once at startup, the two things that most often explain "it runs but nothing works":
 * which database is really in use and which Firebase project verifies registrations.
 * Never logs a password or secret; only whether they are present.
 */
@Component
public class StartupReport {

    private static final Logger log = LoggerFactory.getLogger(StartupReport.class);

    private final Environment env;
    private final AppProperties props;

    public StartupReport(Environment env, AppProperties props) {
        this.env = env;
        this.props = props;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void report() {
        String url = env.getProperty("spring.datasource.url", "");
        String profiles = Arrays.toString(env.getActiveProfiles());
        if (url.startsWith("jdbc:h2:mem")) {
            log.warn("DATABASE: H2 IN-MEMORY (profiles {}). Data is lost on every restart and PostgreSQL is NOT used. "
                    + "To use PostgreSQL remove SPRING_PROFILES_ACTIVE=dev (the default profile is local).", profiles);
        } else {
            log.info("DATABASE: {} (profiles {})", url.replaceAll("\\?.*$", ""), profiles);
        }
        log.info("REGISTRATION VERIFICATION (Firebase project): {} | first admin: {}", props.firebase().projectId(),
                props.bootstrap() != null && props.bootstrap().adminEmail() != null && !props.bootstrap().adminEmail().isBlank() ? "configured" : "NOT configured");
    }
}
