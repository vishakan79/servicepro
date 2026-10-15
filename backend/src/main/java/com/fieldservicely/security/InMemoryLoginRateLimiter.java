package com.fieldservicely.security;

import com.fieldservicely.config.AppProperties;
import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/** Single-node fallback (dev/tests). Use the Redis implementation when running more than one instance. */
@Component
@ConditionalOnProperty(name = "app.redis.enabled", havingValue = "false", matchIfMissing = true)
public class InMemoryLoginRateLimiter implements LoginRateLimiter {

    private record Entry(int count, Instant windowEnds) {}

    private final ConcurrentHashMap<String, Entry> attempts = new ConcurrentHashMap<>();
    private final AppProperties props;

    public InMemoryLoginRateLimiter(AppProperties props) {
        this.props = props;
    }

    @Override
    public boolean isBlocked(String key) {
        Entry e = attempts.get(key);
        if (e == null) return false;
        if (e.windowEnds().isBefore(Instant.now())) {
            attempts.remove(key, e);
            return false;
        }
        return e.count() >= props.security().loginMaxAttempts();
    }

    @Override
    public void recordFailure(String key) {
        Instant now = Instant.now();
        attempts.merge(key, new Entry(1, now.plus(props.security().loginWindow())),
                (old, ignored) -> old.windowEnds().isBefore(now)
                        ? new Entry(1, now.plus(props.security().loginWindow()))
                        : new Entry(old.count() + 1, old.windowEnds()));
    }

    @Override
    public void reset(String key) {
        attempts.remove(key);
    }
}
