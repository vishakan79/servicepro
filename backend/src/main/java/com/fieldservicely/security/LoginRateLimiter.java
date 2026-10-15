package com.fieldservicely.security;


/** Brute-force protection for the login endpoint. */
public interface LoginRateLimiter {
    boolean isBlocked(String key);

    void recordFailure(String key);

    void reset(String key);
}
