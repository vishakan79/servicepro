package com.fieldservicely.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** A "request a demo" message from the public website. No account is created; staff follow up by email or phone. */
@Entity
@Table(name = "inquiries")
@Getter
@Setter
@NoArgsConstructor
public class Inquiry {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false, length = 120)
    private String name;
    @Column(nullable = false, length = 160)
    private String email;
    @Column(length = 120)
    private String company;
    @Column(length = 30)
    private String phone;
    @Column(length = 60)
    private String interest;
    @Column(nullable = false, length = 2000)
    private String message;
    @Column(nullable = false)
    private Instant createdAt;
}
