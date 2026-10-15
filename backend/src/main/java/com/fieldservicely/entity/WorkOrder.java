package com.fieldservicely.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import java.time.LocalDate;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "work_orders")
@Getter
@Setter
@NoArgsConstructor
public class WorkOrder {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false)
    private Long requestId;
    @Column(nullable = false)
    private Long customerId;
    @Column(nullable = false)
    private String serviceType;
    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(nullable = false, length = 10)
    private Priority priority;
    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(nullable = false, length = 20)
    private WorkOrderStatus status;
    private Long technicianId;
    /** Preferred date until a technician is assigned, then the booked date. */
    @Column(nullable = false)
    private LocalDate scheduledDate;
    @Column(nullable = false)
    private int startHour;
    @Column(nullable = false)
    private int durationHours;
    @Column(nullable = false, length = 2000)
    private String description;
    @Column(length = 500)
    private String notes;
    @Column(nullable = false)
    private Instant slaDueAt;
    @Column(nullable = false)
    private boolean slaBreached;
    private Instant startedAt;
    private Instant completedAt;
    @Column(nullable = false)
    private Instant createdAt;
    @Column(nullable = false)
    private Instant updatedAt;
    /** Optimistic lock: concurrent edits of the same order fail with 409 instead of overwriting each other. */
    @Version
    private long version;

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        if (createdAt == null) createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}
