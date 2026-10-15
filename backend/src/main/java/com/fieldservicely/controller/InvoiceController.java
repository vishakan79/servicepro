package com.fieldservicely.controller;

import com.fieldservicely.dto.BillingDtos.InvoiceSummary;
import com.fieldservicely.dto.BillingDtos.InvoiceView;
import com.fieldservicely.dto.BillingDtos.PayRequest;
import com.fieldservicely.dto.PageResponse;
import com.fieldservicely.security.CurrentUser;
import com.fieldservicely.service.BillingService;
import com.fieldservicely.util.Paging;
import jakarta.validation.Valid;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/invoices")
@PreAuthorize("hasAnyRole('ADMIN','MANAGER','CUSTOMER')")
public class InvoiceController {

    private final BillingService billing;

    public InvoiceController(BillingService billing) {
        this.billing = billing;
    }

    @GetMapping
    public PageResponse<InvoiceSummary> list(@RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        return billing.list(Paging.of(page, size, Sort.by(Sort.Direction.DESC, "id")), CurrentUser.require());
    }

    @GetMapping("/{id}")
    public InvoiceView get(@PathVariable Long id) {
        return billing.get(id, CurrentUser.require());
    }

    @PostMapping("/{id}/pay")
    public InvoiceView pay(@PathVariable Long id, @Valid @RequestBody PayRequest body) {
        return billing.pay(id, body.method(), CurrentUser.require());
    }
}
