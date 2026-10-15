package com.fieldservicely.config;

import java.time.Clock;
import java.time.ZoneId;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** Shared beans. Async, scheduling and caching are enabled in {@link SchedulingConfig}. */
@Configuration
public class AppConfig {

    @Bean
    public Clock clock(AppProperties props) {
        return Clock.system(ZoneId.of(props.zone()));
    }
}
