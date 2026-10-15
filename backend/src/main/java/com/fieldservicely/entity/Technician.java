package com.fieldservicely.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "technicians")
@Getter
@Setter
@NoArgsConstructor
public class Technician {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false)
    private String name;
    @Column(nullable = false)
    private String title;
    /** Comma separated, e.g. "AC,Electrical". */
    @Column(nullable = false)
    private String skills;
    @Column(nullable = false, precision = 2, scale = 1)
    private BigDecimal rating;
    @Column(nullable = false)
    private int completedJobs;
    @Column(nullable = false)
    private boolean onLeave;
    @Column(nullable = false)
    private String phone;
    @Column(nullable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) createdAt = Instant.now();
    }

    public List<String> skillList() {
        return Arrays.stream(skills.split(",")).map(String::trim).filter(s -> !s.isEmpty()).toList();
    }
}
