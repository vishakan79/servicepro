package com.fieldservicely.entity;

import com.fieldservicely.security.AuthUser;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false)
    private String name;
    @Column(nullable = false, unique = true)
    private String email;
    /** BCrypt hash. Never serialised: UserView does not carry it. */
    @Column(name = "password_hash", nullable = false, length = 100)
    private String passwordHash;
    /** E.164 (+919876543210). Unique and verified by a Firebase SMS code at registration. */
    @Column(length = 20, unique = true)
    private String phone;
    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(nullable = false, length = 20)
    private Role role;
    private Long customerId;
    private Long technicianId;
    @Column(nullable = false)
    private boolean enabled = true;
    @Column(name = "email_verified", nullable = false)
    private boolean emailVerified;
    @Column(name = "phone_verified", nullable = false)
    private boolean phoneVerified;
    /** Staff who self-registered wait here until an administrator approves them (enabled stays false until then). */
    @Column(name = "approval_pending", nullable = false)
    private boolean approvalPending;
    @Column(nullable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) createdAt = Instant.now();
    }

    public AuthUser toAuthUser() {
        return new AuthUser(id, name, email, role, customerId, technicianId);
    }
}
