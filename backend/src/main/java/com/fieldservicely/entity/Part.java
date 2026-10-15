package com.fieldservicely.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "parts")
@Getter
@Setter
@NoArgsConstructor
public class Part {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false, unique = true)
    private String code;
    @Column(nullable = false)
    private String name;
    @Column(nullable = false)
    private String category;
    @Column(nullable = false)
    private String brand;
    @Column(nullable = false)
    private int stock;
    @Column(nullable = false)
    private int reorderLevel;
    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal unitPrice;

    public String stockState() {
        return stock == 0 ? "OUT_OF_STOCK" : stock <= reorderLevel ? "LOW_STOCK" : "IN_STOCK";
    }
}
