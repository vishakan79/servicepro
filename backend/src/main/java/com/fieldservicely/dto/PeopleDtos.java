package com.fieldservicely.dto;

import com.fieldservicely.entity.Customer;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.util.List;

public final class PeopleDtos {
    private PeopleDtos() {}

    public record CustomerView(Long id, String name, String phone, String email, String address, String area) {
        public static CustomerView of(Customer c) {
            return new CustomerView(c.getId(), c.getName(), c.getPhone(), c.getEmail(), c.getAddress(), c.getArea());
        }
    }

    public record CreateCustomer(
            @NotBlank @Size(max = 120) String name,
            @NotBlank @Pattern(regexp = "^[+0-9 ()-]{7,30}$", message = "must be a valid phone number") String phone,
            @NotBlank @Email @Size(max = 160) String email,
            @NotBlank @Size(max = 300) String address,
            @Size(max = 80) String area) {}

    /** status is one of AVAILABLE, ON_DUTY, ON_LEAVE (derived from live work orders). */
    public record TechnicianView(Long id, String name, String title, List<String> skills, BigDecimal rating, int completedJobs,
                                 String status, String phone, int openJobs) {}
}
