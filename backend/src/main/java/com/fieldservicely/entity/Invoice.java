package com.fieldservicely.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "invoices")
@Getter
@Setter
@NoArgsConstructor
public class Invoice {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false, unique = true)
    private Long workOrderId;
    @Column(nullable = false)
    private Long customerId;
    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(nullable = false, length = 10)
    private InvoiceStatus status;
    @Column(nullable = false)
    private LocalDate issuedOn;
    @Column(nullable = false)
    private LocalDate dueOn;
    private String paymentMethod;
    private String transactionRef;
    @Column(nullable = false)
    private Instant createdAt;

    /** PENDING invoices past their due date are reported as OVERDUE without needing a nightly job. */
    public InvoiceStatus effectiveStatus(LocalDate today) {
        return status == InvoiceStatus.PENDING && dueOn.isBefore(today) ? InvoiceStatus.OVERDUE : status;
    }
}
