package com.fieldservicely.dto;

import com.fieldservicely.entity.Inquiry;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.Instant;

public final class InquiryDtos {
    private InquiryDtos() {}

    /** website is a honeypot: real visitors never see or fill it, bots usually do. */
    public record CreateInquiry(
            @NotBlank @Size(max = 120) String name,
            @NotBlank @Email @Size(max = 160) String email,
            @Size(max = 120) String company,
            @Pattern(regexp = "^$|^[+0-9 ()-]{7,30}$", message = "must be a valid phone number") String phone,
            @Size(max = 60) String interest,
            @NotBlank @Size(min = 10, max = 2000) String message,
            @Size(max = 200) String website) {}

    public record InquiryReceipt(Long id) {}

    public record InquiryView(Long id, String name, String email, String company, String phone, String interest, String message,
                              Instant createdAt) {
        public static InquiryView of(Inquiry i) {
            return new InquiryView(i.getId(), i.getName(), i.getEmail(), i.getCompany(), i.getPhone(), i.getInterest(), i.getMessage(),
                    i.getCreatedAt());
        }
    }
}
