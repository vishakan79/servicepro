package com.fieldservicely.security;

import java.security.Principal;

/** Name is the numeric user id, which is what convertAndSendToUser(...) addresses. */
public class StompPrincipal implements Principal {
    private final AuthUser user;

    public StompPrincipal(AuthUser user) {
        this.user = user;
    }

    public AuthUser user() {
        return user;
    }

    @Override
    public String getName() {
        return String.valueOf(user.id());
    }
}
