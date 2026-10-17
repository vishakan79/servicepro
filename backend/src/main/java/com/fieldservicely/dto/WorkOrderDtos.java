package com.fieldservicely.dto;

import com.fieldservicely.dto.PeopleDtos.CustomerView;
import com.fieldservicely.dto.PeopleDtos.TechnicianView;
import com.fieldservicely.entity.Priority;
import com.fieldservicely.entity.RequestStatus;
import com.fieldservicely.entity.WorkOrderStatus;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public final class WorkOrderDtos {
    private WorkOrderDtos() {}

    // ---- requests ----
    /** customerId is required for staff and ignored for customers (they always act as themselves). */
    public record CreateRequest(
            Long customerId,
            @NotBlank @Size(max = 80) String issueType,
            @NotNull Priority priority,
            @NotBlank @Size(max = 2000) String description,
            @Min(0) @Max(5) int imageCount) {}

    public record AssignRequest(
            @NotNull Long technicianId,
            @NotNull LocalDate date,
            @Min(7) @Max(19) int startHour,
            @Min(1) @Max(8) int durationHours,
            @Size(max = 500) String notes) {}

    public record StatusRequest(@NotNull WorkOrderStatus status) {}

    public record ChecklistRequest(boolean done) {}

    /** Optional job-site coordinates, sent only when the technician consents in the browser. */
    public record PunchRequest(Double lat, Double lng) {}

    public record LogRequest(@NotBlank @Size(max = 1000) String text) {}

    public record PartRequest(@NotNull Long partId, @Min(1) @Max(1000) int quantity) {}

    public record FeedbackRequest(@Min(1) @Max(5) int stars, @Size(max = 1000) String comment) {}

    // ---- views ----
    public record RequestView(Long id, String code, Long customerId, String customerName, String issueType, Priority priority,
                              RequestStatus status, String description, Instant createdAt, String createdBy, int imageCount,
                              Long workOrderId, String workOrderCode) {}

    public record WorkOrderSummary(Long id, String code, Long customerId, String customerName, String serviceType, Priority priority,
                                   WorkOrderStatus status, Long technicianId, String technicianName, LocalDate scheduledDate,
                                   int startHour, int durationHours, Instant slaDueAt, boolean slaBreached) {}

    public record TimelineEntry(String label, String actor, Instant at) {}

    public record ChecklistView(Long id, String label, boolean done) {}

    public record LogView(String text, String author, Instant at) {}

    public record PartLine(Long partId, String code, String name, int quantity, BigDecimal unitPrice, BigDecimal amount) {}

    public record FeedbackView(Long workOrderId, String workOrderCode, String customerName, String serviceType, int stars,
                               String comment, Instant createdAt) {}

    public record WorkOrderDetail(WorkOrderSummary summary, String description, String notes, Instant startedAt, Instant completedAt,
                                  CustomerView customer, TechnicianView technician, List<TimelineEntry> timeline,
                                  List<ChecklistView> checklist, List<LogView> logs, List<PartLine> parts, FeedbackView feedback,
                                  List<WorkOrderStatus> allowedTransitions) {}
}
