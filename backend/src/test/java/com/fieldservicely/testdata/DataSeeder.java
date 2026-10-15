package com.fieldservicely.testdata;

import com.fieldservicely.entity.ChecklistItem;
import com.fieldservicely.entity.Customer;
import com.fieldservicely.entity.Feedback;
import com.fieldservicely.entity.Invoice;
import com.fieldservicely.entity.InvoiceStatus;
import com.fieldservicely.entity.Part;
import com.fieldservicely.entity.PartUsage;
import com.fieldservicely.entity.Priority;
import com.fieldservicely.entity.RequestStatus;
import com.fieldservicely.entity.Role;
import com.fieldservicely.entity.ServiceRequest;
import com.fieldservicely.entity.Technician;
import com.fieldservicely.entity.User;
import com.fieldservicely.entity.WorkLog;
import com.fieldservicely.entity.WorkOrder;
import com.fieldservicely.entity.WorkOrderEvent;
import com.fieldservicely.entity.WorkOrderStatus;
import com.fieldservicely.repository.ChecklistItemRepository;
import com.fieldservicely.repository.CustomerRepository;
import com.fieldservicely.repository.FeedbackRepository;
import com.fieldservicely.repository.PartRepository;
import com.fieldservicely.repository.PartUsageRepository;
import com.fieldservicely.repository.ServiceRequestRepository;
import com.fieldservicely.repository.TechnicianRepository;
import com.fieldservicely.repository.UserRepository;
import com.fieldservicely.repository.WorkLogRepository;
import com.fieldservicely.repository.WorkOrderEventRepository;
import com.fieldservicely.repository.WorkOrderRepository;
import com.fieldservicely.service.BillingService;
import com.fieldservicely.util.SkillCatalog;
import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/** Test fixture only (lives in src/test, so it is never packaged): sample business data and one user per role. */
@Component
@ConditionalOnProperty(name = "app.seed.enabled", havingValue = "true")
public class DataSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DataSeeder.class);

    private record Seed(int customer, String type, Priority priority, WorkOrderStatus status, int tech, int dayOffset, int hour,
                        int duration, int stars, String comment, int[][] parts) {}

    private final UserRepository users;
    private final CustomerRepository customers;
    private final TechnicianRepository technicians;
    private final PartRepository parts;
    private final ServiceRequestRepository requests;
    private final WorkOrderRepository workOrders;
    private final WorkOrderEventRepository events;
    private final ChecklistItemRepository checklist;
    private final WorkLogRepository logs;
    private final PartUsageRepository usages;
    private final FeedbackRepository feedback;
    private final BillingService billing;
    private final com.fieldservicely.repository.InvoiceRepository invoices;

    public DataSeeder(UserRepository users, CustomerRepository customers, TechnicianRepository technicians, PartRepository parts,
                      ServiceRequestRepository requests, WorkOrderRepository workOrders, WorkOrderEventRepository events,
                      ChecklistItemRepository checklist, WorkLogRepository logs, PartUsageRepository usages, FeedbackRepository feedback,
                      BillingService billing, com.fieldservicely.repository.InvoiceRepository invoices) {
        this.users = users;
        this.customers = customers;
        this.technicians = technicians;
        this.parts = parts;
        this.requests = requests;
        this.workOrders = workOrders;
        this.events = events;
        this.checklist = checklist;
        this.logs = logs;
        this.usages = usages;
        this.feedback = feedback;
        this.billing = billing;
        this.invoices = invoices;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (users.count() > 0) return;

        List<Customer> cust = new ArrayList<>();
        String[][] cs = {
            {"Ravi Kumar", "+91 98765 43210", "ravi@example.com", "123, MG Road, T. Nagar, Chennai - 600017", "T. Nagar"},
            {"Priya Sharma", "+91 98765 11122", "priya@example.com", "45, 2nd Cross St, Adyar, Chennai - 600020", "Adyar"},
            {"Suresh Babu", "+91 98410 22334", "suresh@example.com", "78, Anna Salai, Guindy, Chennai - 600032", "Guindy"},
            {"Anitha R.", "+91 99620 55667", "anitha@example.com", "12, Velachery Main Rd, Chennai - 600042", "Velachery"},
            {"Vikram M.", "+91 97890 77889", "vikram@example.com", "9, Mount Road, Egmore, Chennai - 600008", "Egmore"},
            {"Deepa Nair", "+91 96000 99001", "deepa@example.com", "33, 4th Avenue, Anna Nagar, Chennai - 600040", "Anna Nagar"},
            {"Ganesh Iyer", "+91 94440 12345", "ganesh@example.com", "21, Luz Church Rd, Mylapore, Chennai - 600004", "Mylapore"},
            {"Meena Krishnan", "+91 98840 67890", "meena@example.com", "56, Beach Rd, Besant Nagar, Chennai - 600090", "Besant Nagar"},
        };
        for (String[] c : cs) {
            Customer x = new Customer();
            x.setName(c[0]); x.setPhone(c[1]); x.setEmail(c[2]); x.setAddress(c[3]); x.setArea(c[4]);
            cust.add(customers.save(x));
        }

        List<Technician> techs = new ArrayList<>();
        Object[][] ts = {
            {"Karthik S.", "Senior Technician", "AC,Electrical", "4.8", 120, false},
            {"Prakash R.", "Technician", "AC,Appliance", "4.6", 98, false},
            {"Manoj K.", "Technician", "Appliance,Plumbing", "4.7", 87, false},
            {"Suresh M.", "Senior Technician", "Plumbing,Electrical", "4.6", 76, false},
            {"Arun P.", "Technician", "AC,Plumbing", "4.4", 65, true},
        };
        int n = 1;
        for (Object[] t : ts) {
            Technician x = new Technician();
            x.setName((String) t[0]); x.setTitle((String) t[1]); x.setSkills((String) t[2]);
            x.setRating(new BigDecimal((String) t[3])); x.setCompletedJobs((Integer) t[4]); x.setOnLeave((Boolean) t[5]);
            x.setPhone("+91 98400 1000" + n++);
            techs.add(technicians.save(x));
        }

        addUser("Admin User", "admin@fs.com", "+919000000001", Role.ADMIN, null, null);
        addUser("Meera Menon", "manager@fs.com", "+919000000002", Role.MANAGER, null, null);
        addUser("Karthik S.", "tech@fs.com", "+919000000003", Role.TECHNICIAN, null, techs.get(0).getId());
        addUser("Ravi Kumar", "customer@fs.com", "+919000000004", Role.CUSTOMER, cust.get(0).getId(), null);

        List<Part> inventory = new ArrayList<>();
        Object[][] ps = {
            {"AC-001", "Compressor", "AC Parts", "LG", 12, 15, "12000"}, {"AC-002", "Capacitor", "Electrical", "Universal", 0, 10, "300"},
            {"AC-003", "Fan Motor", "AC Parts", "Samsung", 18, 10, "3500"}, {"AC-004", "AC Gas (R410A)", "AC Parts", "Generic", 40, 15, "2500"},
            {"AC-005", "Air Filter", "AC Parts", "Voltas", 25, 10, "450"}, {"PL-001", "Water Pump", "Plumbing", "Crompton", 15, 15, "2500"},
            {"PL-002", "Pipe Fittings Set", "Plumbing", "Astral", 60, 20, "350"}, {"PL-003", "Ball Valve", "Plumbing", "Prince", 9, 10, "520"},
            {"EL-001", "Circuit Board", "Electrical", "LG", 8, 6, "2500"}, {"EL-002", "MCB 32A", "Electrical", "Havells", 30, 12, "480"},
            {"EL-003", "Wiring Cable 90m", "Electrical", "Polycab", 0, 5, "2100"}, {"AP-001", "Washing Machine Motor", "Appliance", "Whirlpool", 6, 5, "4200"},
        };
        for (Object[] p : ps) {
            Part x = new Part();
            x.setCode((String) p[0]); x.setName((String) p[1]); x.setCategory((String) p[2]); x.setBrand((String) p[3]);
            x.setStock((Integer) p[4]); x.setReorderLevel((Integer) p[5]); x.setUnitPrice(new BigDecimal((String) p[6]));
            inventory.add(parts.save(x));
        }

        // customer index (0-based), type, priority, status, technician index (-1 = none), day offset, hour, duration, stars, comment, {partIndex, qty}
        Seed[] seeds = {
            new Seed(0, "AC Not Cooling", Priority.HIGH, WorkOrderStatus.EN_ROUTE, 0, 0, 11, 2, 0, null, new int[][] {{3, 1}}),
            new Seed(1, "Water Leakage", Priority.MEDIUM, WorkOrderStatus.ASSIGNED, 3, 1, 10, 2, 0, null, new int[0][]),
            new Seed(2, "Electrical Issue", Priority.HIGH, WorkOrderStatus.CREATED, -1, 1, 14, 2, 0, null, new int[0][]),
            new Seed(3, "Appliance Repair", Priority.LOW, WorkOrderStatus.COMPLETED, 2, -2, 9, 2, 5, "Excellent service! Technician was professional and fixed the issue quickly.", new int[][] {{11, 1}}),
            new Seed(7, "AC Maintenance", Priority.MEDIUM, WorkOrderStatus.COMPLETED, 0, -3, 13, 2, 4, "Very satisfied with the service. AC is working perfectly now.", new int[][] {{4, 2}}),
            new Seed(6, "Plumbing", Priority.MEDIUM, WorkOrderStatus.COMPLETED, 2, -1, 15, 1, 5, "Technician was knowledgeable and explained the issue clearly.", new int[][] {{6, 1}}),
            new Seed(5, "Installation", Priority.MEDIUM, WorkOrderStatus.ASSIGNED, 1, 2, 9, 3, 0, null, new int[0][]),
            new Seed(4, "Installation", Priority.MEDIUM, WorkOrderStatus.IN_PROGRESS, 1, 0, 9, 3, 0, null, new int[0][]),
            new Seed(0, "Water Leakage", Priority.LOW, WorkOrderStatus.COMPLETED, 3, -5, 10, 1, 4, "On time and neat work. Would book again.", new int[][] {{7, 1}}),
            new Seed(1, "Appliance Repair", Priority.MEDIUM, WorkOrderStatus.EN_ROUTE, 2, 0, 13, 2, 0, null, new int[0][]),
            new Seed(2, "AC Not Cooling", Priority.HIGH, WorkOrderStatus.CREATED, -1, 0, 16, 2, 0, null, new int[0][]),
            new Seed(3, "Electrical Issue", Priority.MEDIUM, WorkOrderStatus.ASSIGNED, 3, 3, 11, 2, 0, null, new int[0][]),
            new Seed(5, "AC Maintenance", Priority.LOW, WorkOrderStatus.CANCELLED, 0, -1, 10, 1, 0, null, new int[0][]),
            new Seed(7, "Plumbing", Priority.HIGH, WorkOrderStatus.COMPLETED, 3, -4, 14, 2, 3, "Work was fine but arrived a little late.", new int[][] {{6, 2}, {7, 2}}),
            new Seed(6, "AC Not Cooling", Priority.HIGH, WorkOrderStatus.COMPLETED, 1, -6, 10, 2, 4, "Quick diagnosis and fair pricing.", new int[][] {{1, 1}}),
        };
        for (Seed s : seeds) seedWorkOrder(s, cust, techs, inventory);

        // Make the first completed invoices paid and one overdue so the billing screens have all three states.
        List<Invoice> all = invoices.findAllByOrderByIdDesc();
        String[] methods = {"UPI", "Credit Card", "Bank Transfer"};
        int paid = 0;
        for (int i = all.size() - 1; i >= 0; i--) {
            Invoice inv = all.get(i);
            if (paid < 3) {
                inv.setStatus(InvoiceStatus.PAID);
                inv.setPaymentMethod(methods[paid]);
                inv.setTransactionRef("TXN" + (500_000_000L + paid * 7919L));
                paid++;
            } else if (i == 0) {
                inv.setIssuedOn(LocalDate.now(ZoneOffset.UTC).minusDays(14));
                inv.setDueOn(LocalDate.now(ZoneOffset.UTC).minusDays(7));
            }
        }
        log.info("Seeded test data");
    }

    private void addUser(String name, String email, String phone, Role role, Long customerId, Long technicianId) {
        User u = new User();
        u.setName(name);
        u.setEmail(email);
        u.setPhone(phone);
        u.setPasswordHash("$2a$04$testtesttesttesttesttuOeXeYQeSQJqj0n8oJk5Qz7k1Hh1b1b1e"); // test fixture, not a real password
        u.setEmailVerified(true);
        u.setPhoneVerified(true);
        u.setRole(role);
        u.setCustomerId(customerId);
        u.setTechnicianId(technicianId);
        u.setEnabled(true);
        users.save(u);
    }

    private void seedWorkOrder(Seed s, List<Customer> cust, List<Technician> techs, List<Part> inventory) {
        Customer c = cust.get(s.customer());
        Technician t = s.tech() >= 0 ? techs.get(s.tech()) : null;
        Instant now = Instant.now();
        Instant created = now.minus(Duration.ofDays(1)).plus(Duration.ofDays(Math.min(s.dayOffset(), 0)));
        boolean done = s.status() == WorkOrderStatus.COMPLETED;
        boolean inProgress = s.status() == WorkOrderStatus.IN_PROGRESS;
        boolean closedOrRolling = done || inProgress || s.status() == WorkOrderStatus.EN_ROUTE;

        ServiceRequest sr = new ServiceRequest();
        sr.setCustomerId(c.getId());
        sr.setIssueType(s.type());
        sr.setPriority(s.priority());
        sr.setStatus(RequestStatus.from(s.status()));
        sr.setDescription(s.type().equals("AC Not Cooling")
                ? "AC is running but not cooling properly. Need service and gas refill."
                : s.type() + " reported at " + c.getArea() + ". Customer requests a visit at the earliest.");
        sr.setImageCount(0);
        sr.setCreatedBy("Admin User");
        sr.setCreatedAt(created);
        requests.save(sr);

        Instant due = created.plus(Duration.ofHours(s.priority().slaHours()));
        WorkOrder w = new WorkOrder();
        w.setRequestId(sr.getId());
        w.setCustomerId(c.getId());
        w.setServiceType(s.type());
        w.setPriority(s.priority());
        w.setStatus(s.status());
        w.setTechnicianId(t == null ? null : t.getId());
        w.setScheduledDate(LocalDate.now(ZoneOffset.UTC).plusDays(s.dayOffset()));
        w.setStartHour(s.hour());
        w.setDurationHours(s.duration());
        w.setDescription(sr.getDescription());
        w.setSlaDueAt(due);
        w.setSlaBreached(WorkOrderStatus.OPEN.contains(s.status()) && due.isBefore(now));
        w.setCreatedAt(created);
        if (inProgress || done) w.setStartedAt(created.plus(Duration.ofHours(2)));
        if (done) w.setCompletedAt(created.plus(Duration.ofHours(4)));
        workOrders.save(w);

        event(w, "Work Order Created", "Admin User", created);
        if (t != null) {
            event(w, "Technician Assigned", "Admin User", created.plusSeconds(1800));
            event(w, "Appointment Scheduled", "Admin User", created.plusSeconds(1900));
        }
        if (closedOrRolling) event(w, "Technician En Route", t.getName(), created.plusSeconds(3600));
        if (inProgress || done) event(w, "Work in Progress", t.getName(), created.plusSeconds(7200));
        if (done) event(w, "Work Completed", t.getName(), created.plusSeconds(14400));
        if (s.status() == WorkOrderStatus.CANCELLED) event(w, "Work Order Cancelled", "Admin User", created.plusSeconds(3600));

        List<String> items = SkillCatalog.CHECKLISTS.get(s.type());
        for (int i = 0; i < items.size(); i++) {
            ChecklistItem item = new ChecklistItem();
            item.setWorkOrderId(w.getId());
            item.setLabel(items.get(i));
            item.setDone(done || (inProgress && i < 2));
            item.setSortOrder(i);
            checklist.save(item);
        }
        if (done || inProgress) {
            WorkLog l = new WorkLog();
            l.setWorkOrderId(w.getId());
            l.setText("Diagnosed the issue and completed the primary repair.");
            l.setAuthor(t.getName());
            l.setAt(created.plusSeconds(9000));
            logs.save(l);
        }
        for (int[] p : s.parts()) {
            Part part = inventory.get(p[0]);
            PartUsage u = new PartUsage();
            u.setWorkOrderId(w.getId());
            u.setPartId(part.getId());
            u.setQuantity(p[1]);
            u.setUnitPrice(part.getUnitPrice());
            usages.save(u);
        }
        if (s.stars() > 0) {
            Feedback f = new Feedback();
            f.setWorkOrderId(w.getId());
            f.setCustomerId(c.getId());
            f.setStars(s.stars());
            f.setComment(s.comment());
            f.setCreatedAt(created.plus(Duration.ofDays(1)));
            feedback.save(f);
        }
        if (done) billing.createForWorkOrder(w);
    }

    private void event(WorkOrder w, String label, String actor, Instant at) {
        WorkOrderEvent e = new WorkOrderEvent();
        e.setWorkOrderId(w.getId());
        e.setLabel(label);
        e.setActor(actor);
        e.setAt(at);
        events.save(e);
    }
}
