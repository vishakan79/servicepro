package com.fieldservicely.security;

import com.fieldservicely.entity.Role;

/** The authenticated principal, rebuilt from the JWT on every request (no DB hit). */
public record AuthUser(Long id, String name, String email, Role role, Long customerId, Long technicianId) {

    public boolean isStaff() {
        return role == Role.ADMIN || role == Role.MANAGER;
    }
}
