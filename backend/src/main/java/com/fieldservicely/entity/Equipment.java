package com.fieldservicely.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** An AC, pump, panel or other asset installed at a customer site, with warranty and AMC dates. */
@Entity
@Table(name = "equipment")
@Getter
@Setter
@NoArgsConstructor
public class Equipment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false)
    private Long customerId;
    @Column(nullable = false, length = 120)
    private String name;
    @Column(length = 60)
    private String category;
    @Column(length = 120)
    private String brandModel;
    @Column(length = 80)
    private String serialNo;
    private LocalDate installDate;
    private LocalDate warrantyUntil;
    private LocalDate amcUntil;
    private LocalDate nextService;
    @Column(length = 500)
    private String notes;
    @Column(nullable = false)
    private Instant createdAt = Instant.now();
}
