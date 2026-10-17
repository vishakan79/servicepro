package com.fieldservicely.service;

import com.fieldservicely.dto.PageResponse;
import com.fieldservicely.dto.PeopleDtos.CustomerView;
import com.fieldservicely.dto.PeopleDtos.TechnicianView;
import com.fieldservicely.dto.WorkOrderDtos.AssignRequest;
import com.fieldservicely.dto.WorkOrderDtos.ChecklistView;
import com.fieldservicely.dto.WorkOrderDtos.CreateRequest;
import com.fieldservicely.dto.WorkOrderDtos.FeedbackRequest;
import com.fieldservicely.dto.WorkOrderDtos.FeedbackView;
import com.fieldservicely.dto.WorkOrderDtos.LogView;
import com.fieldservicely.dto.WorkOrderDtos.PartLine;
import com.fieldservicely.dto.WorkOrderDtos.PartRequest;
import com.fieldservicely.dto.WorkOrderDtos.PunchRequest;
import com.fieldservicely.dto.WorkOrderDtos.RequestView;
import com.fieldservicely.dto.WorkOrderDtos.TimelineEntry;
import com.fieldservicely.dto.WorkOrderDtos.WorkOrderDetail;
import com.fieldservicely.dto.WorkOrderDtos.WorkOrderSummary;
import com.fieldservicely.dto.WorkOrderDtos;
import com.fieldservicely.entity.ChecklistItem;
import com.fieldservicely.entity.Customer;
import com.fieldservicely.entity.Feedback;
import com.fieldservicely.entity.Invoice;
import com.fieldservicely.entity.Part;
import com.fieldservicely.entity.PartUsage;
import com.fieldservicely.entity.RequestStatus;
import com.fieldservicely.entity.Role;
import com.fieldservicely.entity.ServiceRequest;
import com.fieldservicely.entity.Technician;
import com.fieldservicely.entity.WorkLog;
import com.fieldservicely.entity.WorkOrder;
import com.fieldservicely.entity.WorkOrderEvent;
import com.fieldservicely.entity.WorkOrderStatus;
import com.fieldservicely.exception.ApiException;
import com.fieldservicely.mapper.WorkOrderMapper;
import com.fieldservicely.repository.ChecklistItemRepository;
import com.fieldservicely.repository.CustomerRepository;
import com.fieldservicely.repository.FeedbackRepository;
import com.fieldservicely.repository.PartRepository;
import com.fieldservicely.repository.PartUsageRepository;
import com.fieldservicely.repository.ServiceRequestRepository;
import com.fieldservicely.repository.TechnicianRepository;
import com.fieldservicely.repository.WorkLogRepository;
import com.fieldservicely.repository.WorkOrderEventRepository;
import com.fieldservicely.repository.WorkOrderRepository;
import com.fieldservicely.security.AuthUser;
import com.fieldservicely.util.Codes;
import com.fieldservicely.util.SkillCatalog;
import com.fieldservicely.util.WorkOrderScopes;
import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Work order lifecycle. Every method re-checks the caller's access to the specific record (not only the role),
 * so a customer can never read or change another customer's job even if they guess its id.
 */
@Service
public class WorkOrderService {

    private static final int FIRST_HOUR = 7;
    private static final int LAST_HOUR = 20;

    private final WorkOrderRepository workOrders;
    private final ServiceRequestRepository requests;
    private final WorkOrderEventRepository events;
    private final ChecklistItemRepository checklist;
    private final WorkLogRepository logs;
    private final PartUsageRepository usages;
    private final PartRepository parts;
    private final CustomerRepository customers;
    private final TechnicianRepository technicians;
    private final TechnicianService technicianService;
    private final FeedbackRepository feedback;
    private final BillingService billing;
    private final WorkOrderMapper mapper;
    private final AuditService audit;
    private final NotificationService notifications;

    public WorkOrderService(WorkOrderRepository workOrders, ServiceRequestRepository requests, WorkOrderEventRepository events,
                            ChecklistItemRepository checklist, WorkLogRepository logs, PartUsageRepository usages, PartRepository parts,
                            CustomerRepository customers, TechnicianRepository technicians, TechnicianService technicianService,
                            FeedbackRepository feedback, BillingService billing, WorkOrderMapper mapper, AuditService audit,
                            NotificationService notifications) {
        this.workOrders = workOrders;
        this.requests = requests;
        this.events = events;
        this.checklist = checklist;
        this.logs = logs;
        this.usages = usages;
        this.parts = parts;
        this.customers = customers;
        this.technicians = technicians;
        this.technicianService = technicianService;
        this.feedback = feedback;
        this.billing = billing;
        this.mapper = mapper;
        this.audit = audit;
        this.notifications = notifications;
    }

    // ------------------------------------------------------------------ requests

    @Transactional
    public RequestView createRequest(CreateRequest in, AuthUser u) {
        Long customerId = switch (u.role()) {
            case CUSTOMER -> {
                if (u.customerId() == null) throw new ApiException.Forbidden("No customer profile is linked to this account");
                yield u.customerId();
            }
            case ADMIN, MANAGER -> {
                if (in.customerId() == null) throw new ApiException.BadRequest("customerId is required");
                yield in.customerId();
            }
            case TECHNICIAN -> throw new ApiException.Forbidden("Technicians cannot create service requests");
        };
        Customer customer = customers.findById(customerId).orElseThrow(() -> new ApiException.BadRequest("Unknown customer"));
        if (!SkillCatalog.isKnown(in.issueType())) throw new ApiException.BadRequest("Unknown issue type");

        Instant now = Instant.now();
        ServiceRequest sr = new ServiceRequest();
        sr.setCustomerId(customer.getId());
        sr.setIssueType(in.issueType());
        sr.setPriority(in.priority());
        sr.setStatus(RequestStatus.NEW);
        sr.setDescription(in.description().trim());
        sr.setImageCount(in.imageCount());
        sr.setCreatedBy(u.name());
        sr.setCreatedAt(now);
        requests.save(sr);

        WorkOrder w = new WorkOrder();
        w.setRequestId(sr.getId());
        w.setCustomerId(customer.getId());
        w.setServiceType(in.issueType());
        w.setPriority(in.priority());
        w.setStatus(WorkOrderStatus.CREATED);
        w.setScheduledDate(LocalDate.now(ZoneOffset.UTC).plusDays(1));
        w.setStartHour(10);
        w.setDurationHours(2);
        w.setDescription(sr.getDescription());
        w.setSlaDueAt(now.plus(Duration.ofHours(in.priority().slaHours())));
        w.setSlaBreached(false);
        workOrders.save(w);

        List<String> items = SkillCatalog.CHECKLISTS.get(in.issueType());
        for (int i = 0; i < items.size(); i++) {
            ChecklistItem item = new ChecklistItem();
            item.setWorkOrderId(w.getId());
            item.setLabel(items.get(i));
            item.setDone(false);
            item.setSortOrder(i);
            checklist.save(item);
        }
        event(w.getId(), WorkOrderStatus.CREATED.label(), u.name());
        audit.record(u, "CREATE", "ServiceRequest", sr.getId(), in.issueType() + " for " + customer.getName());
        notifications.workOrderChanged(w, "New " + in.priority().name().toLowerCase() + " priority request from " + customer.getName());
        return mapper.requests(List.of(sr)).get(0);
    }

    @Transactional(readOnly = true)
    public PageResponse<RequestView> listRequests(Pageable pageable, AuthUser u) {
        Page<ServiceRequest> page = switch (u.role()) {
            case CUSTOMER -> requests.findByCustomerId(u.customerId(), pageable);
            case ADMIN, MANAGER -> requests.findAll(pageable);
            case TECHNICIAN -> throw new ApiException.Forbidden("Technicians cannot list service requests");
        };
        return PageResponse.of(page, mapper.requests(page.getContent()));
    }

    // ------------------------------------------------------------------ queries

    @Transactional(readOnly = true)
    public PageResponse<WorkOrderSummary> list(WorkOrderStatus status, Pageable pageable, AuthUser u) {
        Specification<WorkOrder> spec = WorkOrderScopes.of(u);
        if (status != null) spec = spec.and((r, q, cb) -> cb.equal(r.get("status"), status));
        Page<WorkOrder> page = workOrders.findAll(spec, pageable);
        return PageResponse.of(page, mapper.summaries(page.getContent()));
    }

    /** Booked visits in a date range (the calendar). */
    @Transactional(readOnly = true)
    public List<WorkOrderSummary> appointments(LocalDate from, LocalDate to, AuthUser u) {
        if (to.isBefore(from)) throw new ApiException.BadRequest("'to' must not be before 'from'");
        if (from.plusDays(62).isBefore(to)) throw new ApiException.BadRequest("Date range is limited to 62 days");
        Specification<WorkOrder> spec = WorkOrderScopes.of(u)
                .and((r, q, cb) -> cb.isNotNull(r.get("technicianId")))
                .and((r, q, cb) -> cb.between(r.<LocalDate>get("scheduledDate"), from, to));
        List<WorkOrder> list = workOrders.findAll(spec).stream()
                .sorted(Comparator.comparing(WorkOrder::getScheduledDate).thenComparingInt(WorkOrder::getStartHour))
                .toList();
        return mapper.summaries(list);
    }

    @Transactional(readOnly = true)
    public WorkOrderDetail detail(Long id, AuthUser u) {
        WorkOrder w = loadScoped(id, u);
        Customer c = customers.findById(w.getCustomerId()).orElse(null);
        Technician t = w.getTechnicianId() == null ? null : technicians.findById(w.getTechnicianId()).orElse(null);
        TechnicianView tv = t == null ? null : technicianService.views(List.of(t)).get(0);
        List<TimelineEntry> timeline = events.findByWorkOrderIdOrderByAtAscIdAsc(id).stream()
                .map(e -> new TimelineEntry(e.getLabel(), e.getActor(), e.getAt())).toList();
        List<ChecklistView> items = checklist.findByWorkOrderIdOrderBySortOrderAsc(id).stream()
                .map(i -> new ChecklistView(i.getId(), i.getLabel(), i.isDone())).toList();
        List<WorkOrderDtos.LogView> logViews = logs.findByWorkOrderIdOrderByAtDesc(id).stream()
                .map(l -> new LogView(l.getText(), l.getAuthor(), l.getAt())).toList();
        FeedbackView fb = feedback.findByWorkOrderId(id)
                .map(f -> feedbackView(f, w, c)).orElse(null);
        return new WorkOrderDetail(mapper.summary(w, c, t), w.getDescription(), w.getNotes(), w.getStartedAt(), w.getCompletedAt(),
                c == null ? null : CustomerView.of(c), tv, timeline, items, logViews, partLines(id), fb, allowedTransitions(w, u));
    }

    // ------------------------------------------------------------------ dispatch

    @Transactional
    public WorkOrderDetail assign(Long id, AssignRequest in, AuthUser u) {
        WorkOrder w = workOrders.findById(id).orElseThrow(() -> new ApiException.NotFound("Work order not found"));
        if (w.getStatus() != WorkOrderStatus.CREATED && w.getStatus() != WorkOrderStatus.ASSIGNED) {
            throw new ApiException.Conflict("A " + w.getStatus().name().toLowerCase().replace('_', ' ') + " work order can no longer be reassigned");
        }
        applyAssignment(w, in.technicianId(), in.date(), in.startHour(), in.durationHours(), in.notes(), u);
        return detail(id, u);
    }

    /** Picks the best free technician for the order's current date and slot: skill match, rating, and lowest load that day. */
    @Transactional
    public WorkOrderDetail autoAssign(Long id, AuthUser u) {
        WorkOrder w = workOrders.findById(id).orElseThrow(() -> new ApiException.NotFound("Work order not found"));
        if (w.getStatus() != WorkOrderStatus.CREATED && w.getStatus() != WorkOrderStatus.ASSIGNED) {
            throw new ApiException.Conflict("Only unassigned or assigned work orders can be auto-assigned");
        }
        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        LocalDate date = w.getScheduledDate().isBefore(today) ? today.plusDays(1) : w.getScheduledDate();
        int end = w.getStartHour() + w.getDurationHours();
        List<String> needed = SkillCatalog.SKILLS.getOrDefault(w.getServiceType(), List.of());

        Technician best = null;
        double bestScore = Double.NEGATIVE_INFINITY;
        for (Technician t : technicians.findAll()) {
            if (t.isOnLeave()) continue;
            if (workOrders.hasClash(w.getId(), t.getId(), date, WorkOrderStatus.ACTIVE, w.getStartHour(), end)) continue;
            long load = workOrders.countByTechnicianIdAndScheduledDateAndStatusIn(t.getId(), date, WorkOrderStatus.ACTIVE);
            boolean skill = t.skillList().stream().anyMatch(needed::contains);
            double score = (skill ? 10 : 0) + t.getRating().doubleValue() - 2.0 * load;
            if (score > bestScore) {
                bestScore = score;
                best = t;
            }
        }
        if (best == null) throw new ApiException.Conflict("No technician is free for that slot. Pick another time.");
        applyAssignment(w, best.getId(), date, w.getStartHour(), w.getDurationHours(), w.getNotes(), u);
        audit.record(u, "AUTO_ASSIGN", "WorkOrder", w.getId(), "Picked " + best.getName());
        return detail(id, u);
    }

    private void applyAssignment(WorkOrder w, Long technicianId, LocalDate date, int start, int duration, String notes, AuthUser u) {
        if (date.isBefore(LocalDate.now(ZoneOffset.UTC))) throw new ApiException.BadRequest("The appointment date cannot be in the past");
        if (start < FIRST_HOUR || start + duration > LAST_HOUR) {
            throw new ApiException.BadRequest("Appointments must fall between " + FIRST_HOUR + ":00 and " + LAST_HOUR + ":00");
        }
        // Row lock on the technician serialises concurrent bookings, so the clash check below cannot race.
        Technician t = technicians.findByIdForUpdate(technicianId).orElseThrow(() -> new ApiException.NotFound("Technician not found"));
        if (t.isOnLeave()) throw new ApiException.BadRequest(t.getName() + " is on leave");
        if (workOrders.hasClash(w.getId(), t.getId(), date, WorkOrderStatus.ACTIVE, start, start + duration)) {
            throw new ApiException.Conflict(t.getName() + " already has a job in that time slot");
        }
        boolean first = w.getStatus() == WorkOrderStatus.CREATED;
        w.setTechnicianId(t.getId());
        w.setScheduledDate(date);
        w.setStartHour(start);
        w.setDurationHours(duration);
        w.setNotes(notes == null || notes.isBlank() ? null : notes.trim());
        w.setStatus(WorkOrderStatus.ASSIGNED);
        workOrders.save(w);
        requests.findById(w.getRequestId()).ifPresent(r -> r.setStatus(RequestStatus.SCHEDULED));
        event(w.getId(), first ? "Technician Assigned" : "Technician Reassigned", u.name());
        event(w.getId(), "Appointment Scheduled", u.name());
        audit.record(u, "ASSIGN", "WorkOrder", w.getId(), t.getName() + " on " + date + " at " + start + ":00");
        notifications.workOrderChanged(w, t.getName() + " assigned for " + date + " at " + start + ":00");
        customers.findById(w.getCustomerId()).ifPresent(c -> notifications.email(c.getEmail(),
                "Your technician is booked (" + Codes.workOrder(w.getId(), w.getCreatedAt()) + ")",
                t.getName() + " will visit on " + date + " around " + start + ":00 for: " + w.getServiceType()));
    }

    // ------------------------------------------------------------------ progress

    @Transactional
    public WorkOrderDetail changeStatus(Long id, WorkOrderStatus target, AuthUser u) {
        WorkOrder w = loadScoped(id, u);
        if (u.role() == Role.CUSTOMER) throw new ApiException.Forbidden("Customers cannot change work order status");
        if (u.role() == Role.TECHNICIAN && target == WorkOrderStatus.CANCELLED) {
            throw new ApiException.Forbidden("Only dispatchers can cancel a work order");
        }
        if (!w.getStatus().next().contains(target)) {
            throw new ApiException.Conflict("Cannot move a work order from " + w.getStatus() + " to " + target);
        }
        if (target == WorkOrderStatus.COMPLETED) {
            boolean pending = checklist.findByWorkOrderIdOrderBySortOrderAsc(id).stream().anyMatch(i -> !i.isDone());
            if (pending) throw new ApiException.BadRequest("Complete every checklist item before closing the job");
        }
        Instant now = Instant.now();
        w.setStatus(target);
        if (target == WorkOrderStatus.IN_PROGRESS) w.setStartedAt(now);
        if (target == WorkOrderStatus.COMPLETED) {
            w.setCompletedAt(now);
            if (now.isAfter(w.getSlaDueAt())) w.setSlaBreached(true);
        }
        workOrders.save(w);
        requests.findById(w.getRequestId()).ifPresent(r -> r.setStatus(RequestStatus.from(target)));
        event(id, target.label(), u.name());
        audit.record(u, "STATUS", "WorkOrder", id, "-> " + target);

        if (target == WorkOrderStatus.COMPLETED) {
            if (w.getTechnicianId() != null) technicians.incrementCompletedJobs(w.getTechnicianId());
            Invoice inv = billing.createForWorkOrder(w);
            customers.findById(w.getCustomerId()).ifPresent(c -> notifications.email(c.getEmail(),
                    "Invoice " + Codes.invoice(inv.getId(), inv.getCreatedAt()) + " for " + Codes.workOrder(w.getId(), w.getCreatedAt()),
                    "Your job is complete. The invoice is due on " + inv.getDueOn() + "."));
        }
        notifications.workOrderChanged(w, Codes.workOrder(w.getId(), w.getCreatedAt()) + " is now " + target.label());
        return detail(id, u);
    }

    /** Arrive on site: moves ASSIGNED/EN_ROUTE jobs to IN_PROGRESS and records the (optional) location in the timeline. */
    @Transactional
    public WorkOrderDetail checkIn(Long id, PunchRequest in, AuthUser u) {
        WorkOrder w = loadScoped(id, u);
        requireWorker(u);
        if (w.getStatus() == WorkOrderStatus.ASSIGNED) changeStatus(id, WorkOrderStatus.EN_ROUTE, u);
        if (w.getStatus() == WorkOrderStatus.EN_ROUTE) changeStatus(id, WorkOrderStatus.IN_PROGRESS, u);
        else if (w.getStatus() != WorkOrderStatus.IN_PROGRESS) throw new ApiException.Conflict("Cannot check in to a " + w.getStatus() + " job");
        event(id, "Technician checked in" + place(in), u.name());
        audit.record(u, "CHECK_IN", "WorkOrder", id, place(in));
        return detail(id, u);
    }

    /** Leave the site; the job itself is closed separately once the checklist is done. */
    @Transactional
    public WorkOrderDetail checkOut(Long id, PunchRequest in, AuthUser u) {
        WorkOrder w = loadScoped(id, u);
        requireWorker(u);
        if (w.getStatus() != WorkOrderStatus.IN_PROGRESS) throw new ApiException.Conflict("Check in before checking out");
        event(id, "Technician checked out" + place(in), u.name());
        audit.record(u, "CHECK_OUT", "WorkOrder", id, place(in));
        return detail(id, u);
    }

    private static String place(PunchRequest in) {
        if (in.lat() == null || in.lng() == null) return "";
        if (Math.abs(in.lat()) > 90 || Math.abs(in.lng()) > 180) throw new ApiException.BadRequest("Invalid location");
        return String.format(java.util.Locale.ROOT, " at %.5f, %.5f", in.lat(), in.lng());
    }

    @Transactional
    public ChecklistView setChecklist(Long woId, Long itemId, boolean done, AuthUser u) {
        WorkOrder w = loadScoped(woId, u);
        requireWorker(u);
        requireOpen(w);
        ChecklistItem item = checklist.findById(itemId).filter(i -> i.getWorkOrderId().equals(woId))
                .orElseThrow(() -> new ApiException.NotFound("Checklist item not found"));
        item.setDone(done);
        return new ChecklistView(item.getId(), item.getLabel(), item.isDone());
    }

    @Transactional
    public LogView addLog(Long woId, String text, AuthUser u) {
        WorkOrder w = loadScoped(woId, u);
        requireWorker(u);
        requireOpen(w);
        WorkLog l = new WorkLog();
        l.setWorkOrderId(woId);
        l.setText(text.trim());
        l.setAuthor(u.name());
        l.setAt(Instant.now());
        logs.save(l);
        return new LogView(l.getText(), l.getAuthor(), l.getAt());
    }

    /** Consumes stock atomically; fails with 409 instead of ever driving stock negative. */
    @Transactional
    public List<PartLine> addPart(Long woId, PartRequest in, AuthUser u) {
        WorkOrder w = loadScoped(woId, u);
        requireWorker(u);
        requireOpen(w);
        if (w.getStatus() == WorkOrderStatus.CREATED) throw new ApiException.Conflict("Assign a technician before recording parts");
        Part part = parts.findById(in.partId()).orElseThrow(() -> new ApiException.NotFound("Part not found"));
        if (parts.decrementStock(part.getId(), in.quantity()) == 0) {
            throw new ApiException.Conflict("Only " + part.getStock() + " of " + part.getName() + " in stock");
        }
        PartUsage usage = usages.findByWorkOrderId(woId).stream().filter(p -> p.getPartId().equals(part.getId())).findFirst().orElse(null);
        if (usage == null) {
            usage = new PartUsage();
            usage.setWorkOrderId(woId);
            usage.setPartId(part.getId());
            usage.setUnitPrice(part.getUnitPrice());
            usage.setQuantity(in.quantity());
        } else {
            usage.setQuantity(usage.getQuantity() + in.quantity());
        }
        usages.save(usage);
        audit.record(u, "PART_USED", "WorkOrder", woId, in.quantity() + " x " + part.getCode());
        parts.findById(part.getId()).ifPresent(p -> {
            if (p.getStock() <= p.getReorderLevel()) {
                notifications.staffAlert("LOW_STOCK", p.getName() + " (" + p.getCode() + ") is low: " + p.getStock() + " left");
            }
        });
        return partLines(woId);
    }

    @Transactional
    public FeedbackView rate(Long woId, FeedbackRequest in, AuthUser u) {
        if (u.role() != Role.CUSTOMER) throw new ApiException.Forbidden("Only the customer can leave feedback");
        WorkOrder w = loadScoped(woId, u);
        if (w.getStatus() != WorkOrderStatus.COMPLETED) throw new ApiException.Conflict("Feedback is available once the job is completed");
        if (feedback.findByWorkOrderId(woId).isPresent()) throw new ApiException.Conflict("Feedback was already submitted");
        Feedback f = new Feedback();
        f.setWorkOrderId(woId);
        f.setCustomerId(w.getCustomerId());
        f.setStars(in.stars());
        f.setComment(in.comment() == null || in.comment().isBlank() ? null : in.comment().trim());
        f.setCreatedAt(Instant.now());
        feedback.save(f);
        audit.record(u, "FEEDBACK", "WorkOrder", woId, in.stars() + " stars");
        return feedbackView(f, w, customers.findById(w.getCustomerId()).orElse(null));
    }

    @Transactional(readOnly = true)
    public PageResponse<FeedbackView> listFeedback(Pageable pageable, AuthUser u) {
        Page<Feedback> page = switch (u.role()) {
            case ADMIN, MANAGER -> feedback.findAll(pageable);
            case CUSTOMER -> feedback.findByCustomerId(u.customerId(), pageable);
            case TECHNICIAN -> {
                List<Long> mine = workOrders.findAll(WorkOrderScopes.of(u)).stream().map(WorkOrder::getId).toList();
                List<Feedback> all = mine.isEmpty() ? List.of() : feedback.findByWorkOrderIdIn(mine).stream()
                        .sorted(Comparator.comparing(Feedback::getCreatedAt).reversed()).toList();
                int from = (int) Math.min(pageable.getOffset(), all.size());
                int to = Math.min(from + pageable.getPageSize(), all.size());
                yield new org.springframework.data.domain.PageImpl<>(all.subList(from, to), pageable, all.size());
            }
        };
        List<Long> woIds = page.getContent().stream().map(Feedback::getWorkOrderId).toList();
        Map<Long, WorkOrder> byId = woIds.isEmpty() ? Map.of()
                : workOrders.findAllById(woIds).stream().collect(Collectors.toMap(WorkOrder::getId, Function.identity()));
        Map<Long, Customer> cust = customers.findByIdIn(page.getContent().stream().map(Feedback::getCustomerId).collect(Collectors.toSet()))
                .stream().collect(Collectors.toMap(Customer::getId, Function.identity()));
        return PageResponse.of(page, page.getContent().stream()
                .map(f -> feedbackView(f, byId.get(f.getWorkOrderId()), cust.get(f.getCustomerId()))).toList());
    }

    // ------------------------------------------------------------------ helpers

    private WorkOrder loadScoped(Long id, AuthUser u) {
        WorkOrder w = workOrders.findById(id).orElseThrow(() -> new ApiException.NotFound("Work order not found"));
        // 404 rather than 403: do not reveal that someone else's work order exists.
        if (!WorkOrderScopes.canView(w, u)) throw new ApiException.NotFound("Work order not found");
        return w;
    }

    private static void requireWorker(AuthUser u) {
        if (u.role() == Role.CUSTOMER) throw new ApiException.Forbidden("Customers cannot modify job details");
    }

    private static void requireOpen(WorkOrder w) {
        if (!WorkOrderStatus.OPEN.contains(w.getStatus())) throw new ApiException.Conflict("This work order is closed");
    }

    private List<WorkOrderStatus> allowedTransitions(WorkOrder w, AuthUser u) {
        if (u.role() == Role.CUSTOMER) return List.of();
        return w.getStatus().next().stream()
                .filter(s -> !(u.role() == Role.TECHNICIAN && s == WorkOrderStatus.CANCELLED))
                .sorted().toList();
    }

    private void event(Long woId, String label, String actor) {
        WorkOrderEvent e = new WorkOrderEvent();
        e.setWorkOrderId(woId);
        e.setLabel(label);
        e.setActor(actor);
        e.setAt(Instant.now());
        events.save(e);
    }

    private List<PartLine> partLines(Long woId) {
        List<PartUsage> used = usages.findByWorkOrderId(woId);
        if (used.isEmpty()) return List.of();
        Map<Long, Part> byId = parts.findAllById(used.stream().map(PartUsage::getPartId).toList()).stream()
                .collect(Collectors.toMap(Part::getId, Function.identity()));
        return used.stream().map(p -> {
            Part part = byId.get(p.getPartId());
            return new PartLine(p.getPartId(), part.getCode(), part.getName(), p.getQuantity(), p.getUnitPrice(),
                    p.getUnitPrice().multiply(BigDecimal.valueOf(p.getQuantity())));
        }).toList();
    }

    private static FeedbackView feedbackView(Feedback f, WorkOrder w, Customer c) {
        return new FeedbackView(f.getWorkOrderId(), w == null ? null : Codes.workOrder(w.getId(), w.getCreatedAt()),
                c == null ? null : c.getName(), w == null ? null : w.getServiceType(), f.getStars(), f.getComment(), f.getCreatedAt());
    }
}
