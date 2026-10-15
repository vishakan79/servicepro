package com.fieldservicely.controller;

import com.fieldservicely.dto.InquiryDtos.CreateInquiry;
import com.fieldservicely.dto.InquiryDtos.InquiryReceipt;
import com.fieldservicely.dto.InquiryDtos.InquiryView;
import com.fieldservicely.dto.PageResponse;
import com.fieldservicely.service.InquiryService;
import com.fieldservicely.util.ClientIp;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class InquiryController {

    private final InquiryService service;

    public InquiryController(InquiryService service) {
        this.service = service;
    }

    /** Public: submitted from the marketing site's "Request a demo" form. */
    @PostMapping("/public/inquiries")
    @ResponseStatus(HttpStatus.CREATED)
    public InquiryReceipt create(@Valid @RequestBody CreateInquiry body, HttpServletRequest http) {
        return service.create(body, ClientIp.of(http));
    }

    @GetMapping("/admin/inquiries")
    @PreAuthorize("hasRole('ADMIN')")
    public PageResponse<InquiryView> list(@RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        return service.list(page, size);
    }
}
