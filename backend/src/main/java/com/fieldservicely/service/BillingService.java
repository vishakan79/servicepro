package com.fieldservicely.service;

import com.fieldservicely.dto.BillingDtos.InvoiceSummary;
import com.fieldservicely.dto.BillingDtos.InvoiceView;
import com.fieldservicely.dto.BillingDtos.LineView;
import com.fieldservicely.dto.PageResponse;
import com.fieldservicely.dto.PeopleDtos.CustomerView;
import com.fieldservicely.entity.Customer;
import com.fieldservicely.entity.Invoice;
import com.fieldservicely.entity.InvoiceLine;
import com.fieldservicely.entity.InvoiceStatus;
import com.fieldservicely.entity.Part;
import com.fieldservicely.entity.PartUsage;
import com.fieldservicely.entity.Role;
import com.fieldservicely.entity.WorkOrder;
import com.fieldservicely.exception.ApiException;
import com.fieldservicely.repository.CustomerRepository;
import com.fieldservicely.repository.InvoiceLineRepository;
import com.fieldservicely.repository.InvoiceRepository;
import com.fieldservicely.repository.PartRepository;
import com.fieldservicely.repository.PartUsageRepository;
import com.fieldservicely.repository.WorkOrderRepository;
import com.fieldservicely.security.AuthUser;
import com.fieldservicely.util.Codes;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class BillingService {

    public static final BigDecimal GST_RATE = new BigDecimal("0.18");
    static final BigDecimal VISIT_CHARGE = new BigDecimal("500.00");
    static final BigDecimal LABOUR_CHARGE = new BigDecimal("1500.00");
    private static final Set<String> METHODS = Set.of("UPI", "Credit Card", "Bank Transfer", "Cash");
    private static final SecureRandom RANDOM = new SecureRandom();

    private final InvoiceRepository invoices;
    private final InvoiceLineRepository lines;
    private final CustomerRepository customers;
    private final PartUsageRepository usages;
    private final PartRepository parts;
    private final WorkOrderRepository workOrders;
    private final AuditService audit;

    public BillingService(InvoiceRepository invoices, InvoiceLineRepository lines, CustomerRepository customers,
                          PartUsageRepository usages, PartRepository parts, WorkOrderRepository workOrders, AuditService audit) {
        this.invoices = invoices;
        this.lines = lines;
        this.customers = customers;
        this.usages = usages;
        this.parts = parts;
        this.workOrders = workOrders;
        this.audit = audit;
    }

    /** Idempotent: one invoice per work order (also enforced by a unique constraint). Runs inside the completing transaction. */
    @Transactional
    public Invoice createForWorkOrder(WorkOrder w) {
        return invoices.findByWorkOrderId(w.getId()).orElseGet(() -> {
            LocalDate today = LocalDate.now(ZoneOffset.UTC);
            Invoice inv = new Invoice();
            inv.setWorkOrderId(w.getId());
            inv.setCustomerId(w.getCustomerId());
            inv.setStatus(InvoiceStatus.PENDING);
            inv.setIssuedOn(today);
            inv.setDueOn(today.plusDays(7));
            inv.setCreatedAt(Instant.now());
            invoices.save(inv);

            lines.save(new InvoiceLine(inv.getId(), "Service Visit Charge", 1, VISIT_CHARGE));
            lines.save(new InvoiceLine(inv.getId(), w.getServiceType() + " (Labour)", 1, LABOUR_CHARGE));
            List<PartUsage> used = usages.findByWorkOrderId(w.getId());
            Map<Long, Part> byId = used.isEmpty() ? Map.of()
                    : parts.findAllById(used.stream().map(PartUsage::getPartId).toList()).stream()
                            .collect(Collectors.toMap(Part::getId, Function.identity()));
            for (PartUsage p : used) {
                Part part = byId.get(p.getPartId());
                lines.save(new InvoiceLine(inv.getId(), part.getName() + " (" + part.getCode() + ")", p.getQuantity(), p.getUnitPrice()));
            }
            return inv;
        });
    }

    @Transactional(readOnly = true)
    public PageResponse<InvoiceSummary> list(Pageable pageable, AuthUser u) {
        Page<Invoice> page = switch (u.role()) {
            case ADMIN, MANAGER -> invoices.findAll(pageable);
            case CUSTOMER -> invoices.findByCustomerId(u.customerId(), pageable);
            case TECHNICIAN, INVENTORY_MANAGER -> throw new ApiException.Forbidden("Your role cannot view invoices");
        };
        List<Long> ids = page.getContent().stream().map(Invoice::getId).toList();
        Map<Long, List<InvoiceLine>> byInvoice = ids.isEmpty() ? Map.of()
                : lines.findByInvoiceIdIn(ids).stream().collect(Collectors.groupingBy(InvoiceLine::getInvoiceId));
        Map<Long, Customer> cust = customers.findByIdIn(page.getContent().stream().map(Invoice::getCustomerId).collect(Collectors.toSet()))
                .stream().collect(Collectors.toMap(Customer::getId, Function.identity()));
        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        return PageResponse.of(page, page.getContent().stream().map(i -> {
            Customer c = cust.get(i.getCustomerId());
            BigDecimal[] t = totals(byInvoice.getOrDefault(i.getId(), List.of()));
            return new InvoiceSummary(i.getId(), Codes.invoice(i.getId(), i.getCreatedAt()), i.getWorkOrderId(), c == null ? null : c.getName(),
                    i.getIssuedOn(), i.getDueOn(), t[2], i.effectiveStatus(today));
        }).toList());
    }

    @Transactional(readOnly = true)
    public InvoiceView get(Long id, AuthUser u) {
        return view(load(id, u));
    }

    /** Staff may record any payment; a customer pays only their own invoice and cannot choose "Cash". */
    @Transactional
    public InvoiceView pay(Long id, String method, AuthUser u) {
        Invoice inv = load(id, u);
        if (!METHODS.contains(method)) throw new ApiException.BadRequest("Unsupported payment method");
        if (u.role() == Role.CUSTOMER && method.equals("Cash")) throw new ApiException.BadRequest("Choose an online payment method");
        if (inv.getStatus() == InvoiceStatus.PAID) throw new ApiException.Conflict("This invoice is already paid");
        inv.setStatus(InvoiceStatus.PAID);
        inv.setPaymentMethod(method);
        inv.setTransactionRef("TXN" + (100_000_000L + (long) (RANDOM.nextDouble() * 899_999_999L)));
        audit.record(u, "PAYMENT", "Invoice", inv.getId(), method);
        return view(inv);
    }

    private Invoice load(Long id, AuthUser u) {
        Invoice inv = invoices.findById(id).orElseThrow(() -> new ApiException.NotFound("Invoice not found"));
        boolean ok = switch (u.role()) {
            case ADMIN, MANAGER -> true;
            case CUSTOMER -> u.customerId() != null && u.customerId().equals(inv.getCustomerId());
            case TECHNICIAN, INVENTORY_MANAGER -> false;
        };
        if (!ok) throw new ApiException.NotFound("Invoice not found");
        return inv;
    }

    private InvoiceView view(Invoice inv) {
        List<InvoiceLine> ls = lines.findByInvoiceId(inv.getId());
        BigDecimal[] t = totals(ls);
        Customer c = customers.findById(inv.getCustomerId()).orElse(null);
        WorkOrder w = workOrders.findById(inv.getWorkOrderId()).orElse(null);
        List<LineView> lv = new ArrayList<>();
        for (InvoiceLine l : ls) {
            lv.add(new LineView(l.getDescription(), l.getQuantity(), l.getUnitPrice(), l.getUnitPrice().multiply(BigDecimal.valueOf(l.getQuantity()))));
        }
        return new InvoiceView(inv.getId(), Codes.invoice(inv.getId(), inv.getCreatedAt()), inv.getWorkOrderId(),
                w == null ? null : Codes.workOrder(w.getId(), w.getCreatedAt()), c == null ? null : CustomerView.of(c),
                inv.effectiveStatus(LocalDate.now(ZoneOffset.UTC)), inv.getIssuedOn(), inv.getDueOn(), inv.getPaymentMethod(),
                inv.getTransactionRef(), lv, t[0], t[1], t[2]);
    }

    /** @return {subtotal, gst, total}, all rounded to 2 dp */
    public static BigDecimal[] totals(Collection<InvoiceLine> ls) {
        BigDecimal sub = ls.stream().map(l -> l.getUnitPrice().multiply(BigDecimal.valueOf(l.getQuantity()))).reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);
        BigDecimal gst = sub.multiply(GST_RATE).setScale(2, RoundingMode.HALF_UP);
        return new BigDecimal[] {sub, gst, sub.add(gst)};
    }
}
