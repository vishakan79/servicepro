package com.fieldservicely.security;

import com.fieldservicely.config.AppProperties;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

/** Shared counter so the limit holds across every API instance behind the load balancer. */
@Component
@ConditionalOnProperty(name = "app.redis.enabled", havingValue = "true")
public class RedisLoginRateLimiter implements LoginRateLimiter {

    private static final String PREFIX = "login:fail:";

    private final StringRedisTemplate redis;
    private final AppProperties props;

    public RedisLoginRateLimiter(StringRedisTemplate redis, AppProperties props) {
        this.redis = redis;
        this.props = props;
    }

    @Override
    public boolean isBlocked(String key) {
        String v = redis.opsForValue().get(PREFIX + key);
        return v != null && Long.parseLong(v) >= props.security().loginMaxAttempts();
    }

    @Override
    public void recordFailure(String key) {
        Long n = redis.opsForValue().increment(PREFIX + key);
        if (n != null && n == 1L) {
            redis.expire(PREFIX + key, props.security().loginWindow());
        }
    }

    @Override
    public void reset(String key) {
        redis.delete(PREFIX + key);
    }
}
