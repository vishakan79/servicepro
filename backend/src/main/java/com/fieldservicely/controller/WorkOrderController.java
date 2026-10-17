package com.fieldservicely.controller;

import com.fieldservicely.dto.PageResponse;
import com.fieldservicely.dto.WorkOrderDtos.AssignRequest;
import com.fieldservicely.dto.WorkOrderDtos.ChecklistRequest;
import com.fieldservicely.dto.WorkOrderDtos.ChecklistView;
import com.fieldservicely.dto.WorkOrderDtos.CreateRequest;
import com.fieldservicely.dto.WorkOrderDtos.FeedbackRequest;
import com.fieldservicely.dto.WorkOrderDtos.FeedbackView;
import com.fieldservicely.dto.WorkOrderDtos.LogRequest;
import com.fieldservicely.dto.WorkOrderDtos.LogView;
import com.fieldservicely.dto.WorkOrderDtos.PartLine;
import com.fieldservicely.dto.WorkOrderDtos.PartRequest;
import com.fieldservicely.dto.WorkOrderDtos.PunchRequest;
import com.fieldservicely.dto.WorkOrderDtos.RequestView;
import com.fieldservicely.dto.WorkOrderDtos.StatusRequest;
import com.fieldservicely.dto.WorkOrderDtos.WorkOrderDetail;
import com.fieldservicely.dto.WorkOrderDtos.WorkOrderSummary;
import com.fieldservicely.entity.WorkOrderStatus;
import com.fieldservicely.security.CurrentUser;
import com.fieldservicely.service.WorkOrderService;
import com.fieldservicely.util.Paging;
import com.fieldservicely.util.SkillCatalog;
import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.List;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class WorkOrderController {

    private final WorkOrderService service;

    public WorkOrderController(WorkOrderService service) {
        this.service = service;
    }

    @GetMapping("/meta/issue-types")
    public List<String> issueTypes() {
        return SkillCatalog.issueTypes();
    }

    // ---- service requests
    @PostMapping("/requests")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','CUSTOMER')")
    public RequestView createRequest(@Valid @RequestBody CreateRequest body) {
        return service.createRequest(body, CurrentUser.require());
    }

    @GetMapping("/requests")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','CUSTOMER')")
    public PageResponse<RequestView> requests(@RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        return service.listRequests(Paging.of(page, size, Sort.by(Sort.Direction.DESC, "id")), CurrentUser.require());
    }

    // ---- work orders
    @GetMapping("/work-orders")
    public PageResponse<WorkOrderSummary> list(@RequestParam(required = false) WorkOrderStatus status,
                                               @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        Sort sort = Sort.by(Sort.Direction.DESC, "scheduledDate").and(Sort.by(Sort.Direction.DESC, "id"));
        return service.list(status, Paging.of(page, size, sort), CurrentUser.require());
    }

    @GetMapping("/work-orders/{id}")
    public WorkOrderDetail detail(@PathVariable Long id) {
        return service.detail(id, CurrentUser.require());
    }

    @PostMapping("/work-orders/{id}/assign")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public WorkOrderDetail assign(@PathVariable Long id, @Valid @RequestBody AssignRequest body) {
        return service.assign(id, body, CurrentUser.require());
    }

    @PostMapping("/work-orders/{id}/auto-assign")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public WorkOrderDetail autoAssign(@PathVariable Long id) {
        return service.autoAssign(id, CurrentUser.require());
    }

    @PostMapping("/work-orders/{id}/status")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','TECHNICIAN')")
    public WorkOrderDetail status(@PathVariable Long id, @Valid @RequestBody StatusRequest body) {
        return service.changeStatus(id, body.status(), CurrentUser.require());
    }

    @PostMapping("/work-orders/{id}/check-in")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','TECHNICIAN')")
    public WorkOrderDetail checkIn(@PathVariable Long id, @Valid @RequestBody PunchRequest body) {
        return service.checkIn(id, body, CurrentUser.require());
    }

    @PostMapping("/work-orders/{id}/check-out")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','TECHNICIAN')")
    public WorkOrderDetail checkOut(@PathVariable Long id, @Valid @RequestBody PunchRequest body) {
        return service.checkOut(id, body, CurrentUser.require());
    }

    @PutMapping("/work-orders/{id}/checklist/{itemId}")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','TECHNICIAN')")
    public ChecklistView checklist(@PathVariable Long id, @PathVariable Long itemId, @RequestBody ChecklistRequest body) {
        return service.setChecklist(id, itemId, body.done(), CurrentUser.require());
    }

    @PostMapping("/work-orders/{id}/logs")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','TECHNICIAN')")
    public LogView log(@PathVariable Long id, @Valid @RequestBody LogRequest body) {
        return service.addLog(id, body.text(), CurrentUser.require());
    }

    @PostMapping("/work-orders/{id}/parts")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','TECHNICIAN')")
    public List<PartLine> addPart(@PathVariable Long id, @Valid @RequestBody PartRequest body) {
        return service.addPart(id, body, CurrentUser.require());
    }

    @PostMapping("/work-orders/{id}/feedback")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('CUSTOMER')")
    public FeedbackView feedback(@PathVariable Long id, @Valid @RequestBody FeedbackRequest body) {
        return service.rate(id, body, CurrentUser.require());
    }

    // ---- calendar and feedback list
    @GetMapping("/appointments")
    public List<WorkOrderSummary> appointments(@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                                               @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return service.appointments(from, to, CurrentUser.require());
    }

    @GetMapping("/feedback")
    public PageResponse<FeedbackView> feedbackList(@RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        return service.listFeedback(Paging.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")), CurrentUser.require());
    }
}
