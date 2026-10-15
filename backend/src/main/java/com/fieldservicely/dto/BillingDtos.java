package com.fieldservicely.dto;

import com.fieldservicely.dto.PeopleDtos.CustomerView;
import com.fieldservicely.entity.InvoiceStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public final class BillingDtos {
    private BillingDtos() {}

    public record PayRequest(@NotBlank @Size(max = 30) String method) {}

    public record LineView(String description, int quantity, BigDecimal unitPrice, BigDecimal amount) {}

    public record InvoiceSummary(Long id, String number, Long workOrderId, String customerName, LocalDate issuedOn, LocalDate dueOn,
                                 BigDecimal total, InvoiceStatus status) {}

    public record InvoiceView(Long id, String number, Long workOrderId, String workOrderCode, CustomerView customer, InvoiceStatus status,
                              LocalDate issuedOn, LocalDate dueOn, String paymentMethod, String transactionRef, List<LineView> lines,
                              BigDecimal subtotal, BigDecimal gst, BigDecimal total) {}
}
