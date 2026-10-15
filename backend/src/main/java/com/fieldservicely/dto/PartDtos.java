package com.fieldservicely.dto;

import com.fieldservicely.entity.Part;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public final class PartDtos {
    private PartDtos() {}

    public record PartView(Long id, String code, String name, String category, String brand, int stock, int reorderLevel,
                           BigDecimal unitPrice, String state) {
        public static PartView of(Part p) {
            return new PartView(p.getId(), p.getCode(), p.getName(), p.getCategory(), p.getBrand(), p.getStock(), p.getReorderLevel(),
                    p.getUnitPrice(), p.stockState());
        }
    }

    public record CreatePart(
            @NotBlank @Size(max = 30) String code,
            @NotBlank @Size(max = 120) String name,
            @NotBlank @Size(max = 60) String category,
            @NotBlank @Size(max = 60) String brand,
            @Min(0) @Max(1_000_000) int stock,
            @Min(0) @Max(1_000_000) int reorderLevel,
            @NotNull @DecimalMin("0.00") BigDecimal unitPrice) {}

    public record RestockRequest(@Min(1) @Max(100_000) int quantity) {}
}
