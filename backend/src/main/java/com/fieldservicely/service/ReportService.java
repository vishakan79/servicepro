package com.fieldservicely.service;

import com.fieldservicely.dto.PeopleDtos.TechnicianView;
import com.fieldservicely.entity.InvoiceStatus;
import com.fieldservicely.entity.Role;
import com.fieldservicely.entity.WorkOrder;
import com.fieldservicely.entity.WorkOrderStatus;
import com.fieldservicely.repository.FeedbackRepository;
import com.fieldservicely.repository.InvoiceLineRepository;
import com.fieldservicely.repository.ServiceRequestRepository;
import com.fieldservicely.repository.WorkOrderRepository;
import com.fieldservicely.security.AuthUser;
import com.fieldservicely.util.WorkOrderScopes;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ReportService {

    public record Dashboard(long totalRequests, long activeWorkOrders, long pendingAppointments, long overdue, Map<String, Long> statusCounts) {}

    public record MonthPoint(String month, long created, long resolved) {}

    public record Workload(String technician, int openJobs, int completedJobs) {}

    public record Summary(long totalRequests, long completed, int completionRatePercent, double averageRating, BigDecimal revenue,
                          Map<String, Long> byStatus, Map<String, Long> byIssueType, List<MonthPoint> monthly, List<Workload> workload) {}

    private final WorkOrderRepository workOrders;
    private final ServiceRequestRepository requests;
    private final FeedbackRepository feedback;
    private final InvoiceLineRepository invoiceLines;
    private final TechnicianService technicians;

    public ReportService(WorkOrderRepository workOrders, ServiceRequestRepository requests, FeedbackRepository feedback,
                         InvoiceLineRepository invoiceLines, TechnicianService technicians) {
        this.workOrders = workOrders;
        this.requests = requests;
        this.feedback = feedback;
        this.invoiceLines = invoiceLines;
        this.technicians = technicians;
    }

    /** KPI tiles for the home page, scoped to what the caller is allowed to see. */
    @Transactional(readOnly = true)
    public Dashboard dashboard(AuthUser u) {
        Specification<WorkOrder> scope = WorkOrderScopes.of(u);
        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        long total = switch (u.role()) {
            case ADMIN, MANAGER -> requests.count();
            case CUSTOMER -> u.customerId() == null ? 0 : requests.countByCustomerId(u.customerId());
            case TECHNICIAN, INVENTORY_MANAGER -> workOrders.count(scope);
        };
        long active = workOrders.count(scope.and((r, q, cb) -> r.get("status").in(WorkOrderStatus.ACTIVE)));
        long pending = workOrders.count(scope
                .and((r, q, cb) -> cb.equal(r.get("status"), WorkOrderStatus.ASSIGNED))
                .and((r, q, cb) -> cb.greaterThanOrEqualTo(r.<LocalDate>get("scheduledDate"), today)));
        long overdue = workOrders.count(scope
                .and((r, q, cb) -> r.get("status").in(WorkOrderStatus.OPEN))
                .and((r, q, cb) -> cb.or(cb.isTrue(r.get("slaBreached")), cb.lessThan(r.<LocalDate>get("scheduledDate"), today))));
        Map<String, Long> counts = new LinkedHashMap<>();
        for (WorkOrderStatus s : WorkOrderStatus.values()) {
            counts.put(s.name(), workOrders.count(scope.and((r, q, cb) -> cb.equal(r.get("status"), s))));
        }
        return new Dashboard(total, active, pending, overdue, counts);
    }

    /** Management report. Monthly buckets are computed in memory over the last six months, which is fine up to tens of thousands of orders. */
    @Transactional(readOnly = true)
    public Summary summary(AuthUser u) {
        if (u.role() != Role.ADMIN && u.role() != Role.MANAGER) throw new com.fieldservicely.exception.ApiException.Forbidden("Reports are for staff only");
        Map<WorkOrderStatus, Long> byStatus = new EnumMap<>(WorkOrderStatus.class);
        long all = 0;
        for (Object[] row : workOrders.countByStatus()) {
            long n = ((Number) row[1]).longValue();
            byStatus.put((WorkOrderStatus) row[0], n);
            all += n;
        }
        long completed = byStatus.getOrDefault(WorkOrderStatus.COMPLETED, 0L);
        Map<String, Long> status = new LinkedHashMap<>();
        for (WorkOrderStatus s : WorkOrderStatus.values()) status.put(s.name(), byStatus.getOrDefault(s, 0L));

        Map<String, Long> byIssue = new LinkedHashMap<>();
        for (Object[] row : requests.countByIssueType()) byIssue.put((String) row[0], ((Number) row[1]).longValue());

        BigDecimal paid = invoiceLines.sumByInvoiceStatus(InvoiceStatus.PAID);
        BigDecimal revenue = paid == null ? BigDecimal.ZERO
                : paid.add(paid.multiply(BillingService.GST_RATE)).setScale(2, RoundingMode.HALF_UP);
        Double avg = feedback.averageStars();

        List<TechnicianView> techs = technicians.list();
        List<Workload> workload = techs.stream().map(t -> new Workload(t.name(), t.openJobs(), t.completedJobs())).toList();
        return new Summary(requests.count(), completed, all == 0 ? 0 : (int) Math.round(completed * 100.0 / all),
                avg == null ? 0 : Math.round(avg * 10.0) / 10.0, revenue, status, byIssue, monthly(), workload);
    }

    private List<MonthPoint> monthly() {
        YearMonth now = YearMonth.now(ZoneOffset.UTC);
        YearMonth first = now.minusMonths(5);
        Instant since = first.atDay(1).atStartOfDay().toInstant(ZoneOffset.UTC);
        Map<YearMonth, long[]> buckets = new LinkedHashMap<>();
        for (int i = 0; i < 6; i++) buckets.put(first.plusMonths(i), new long[2]);
        for (WorkOrder w : workOrders.findByCreatedAtAfter(since)) {
            long[] b = buckets.get(YearMonth.from(w.getCreatedAt().atZone(ZoneOffset.UTC)));
            if (b != null) b[0]++;
        }
        for (WorkOrder w : workOrders.findAll((r, q, cb) -> cb.greaterThanOrEqualTo(r.<Instant>get("completedAt"), since))) {
            long[] b = buckets.get(YearMonth.from(w.getCompletedAt().atZone(ZoneOffset.UTC)));
            if (b != null) b[1]++;
        }
        List<MonthPoint> out = new ArrayList<>();
        buckets.forEach((m, v) -> out.add(new MonthPoint(m.toString(), v[0], v[1])));
        return out;
    }
}
