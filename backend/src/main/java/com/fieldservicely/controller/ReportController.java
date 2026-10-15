package com.fieldservicely.controller;

import com.fieldservicely.security.CurrentUser;
import com.fieldservicely.service.ReportService.Dashboard;
import com.fieldservicely.service.ReportService.Summary;
import com.fieldservicely.service.ReportService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class ReportController {

    private final ReportService service;

    public ReportController(ReportService service) {
        this.service = service;
    }

    @GetMapping("/dashboard")
    public Dashboard dashboard() {
        return service.dashboard(CurrentUser.require());
    }

    @GetMapping("/reports/summary")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public Summary summary() {
        return service.summary(CurrentUser.require());
    }
}
