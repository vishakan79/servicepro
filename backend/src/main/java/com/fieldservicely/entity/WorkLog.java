package com.fieldservicely.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "work_logs")
@Getter
@Setter
@NoArgsConstructor
public class WorkLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false)
    private Long workOrderId;
    @Column(nullable = false, length = 1000)
    private String text;
    @Column(nullable = false)
    private String author;
    @Column(nullable = false)
    private Instant at;
}
