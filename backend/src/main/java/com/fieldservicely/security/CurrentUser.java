package com.fieldservicely.security;

import com.fieldservicely.exception.ApiException;
import java.util.Optional;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

public final class CurrentUser {
    private CurrentUser() {}

    public static Optional<AuthUser> get() {
        Authentication a = SecurityContextHolder.getContext().getAuthentication();
        if (a != null && a.getPrincipal() instanceof AuthUser u) {
            return Optional.of(u);
        }
        return Optional.empty();
    }

    public static AuthUser require() {
        return get().orElseThrow(() -> new ApiException.Unauthorized("Authentication required"));
    }
}
