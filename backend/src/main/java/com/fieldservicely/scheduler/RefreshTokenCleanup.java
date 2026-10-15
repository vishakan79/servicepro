package com.fieldservicely.scheduler;

import com.fieldservicely.repository.RefreshTokenRepository;
import java.time.Duration;
import java.time.Instant;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/** Keeps the refresh_tokens table from growing forever. Expired tokens are kept a day for reuse-detection forensics. */
@Component
public class RefreshTokenCleanup {

    private final RefreshTokenRepository tokens;

    public RefreshTokenCleanup(RefreshTokenRepository tokens) {
        this.tokens = tokens;
    }

    @Scheduled(cron = "0 30 3 * * *")
    @SchedulerLock(name = "refreshTokenCleanup", lockAtMostFor = "PT10M", lockAtLeastFor = "PT1M")
    @Transactional
    public void purge() {
        tokens.deleteExpired(Instant.now().minus(Duration.ofDays(1)));
    }
}
