package com.fieldservicely.controller;

import com.fieldservicely.dto.PeopleDtos.CreateCustomer;
import com.fieldservicely.dto.PeopleDtos.CustomerView;
import com.fieldservicely.dto.PeopleDtos.TechnicianView;
import com.fieldservicely.entity.Customer;
import com.fieldservicely.repository.CustomerRepository;
import com.fieldservicely.security.CurrentUser;
import com.fieldservicely.service.AuditService;
import com.fieldservicely.service.TechnicianService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
@PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
public class PeopleController {

    private static final int SEARCH_LIMIT = 50;

    private final CustomerRepository customers;
    private final TechnicianService technicians;
    private final AuditService audit;

    public PeopleController(CustomerRepository customers, TechnicianService technicians, AuditService audit) {
        this.customers = customers;
        this.technicians = technicians;
        this.audit = audit;
    }

    /** Type-ahead search (max 50 rows) used by the "existing customer" picker. */
    @GetMapping("/customers")
    @Transactional(readOnly = true)
    public List<CustomerView> customers(@RequestParam(required = false) String q) {
        List<Customer> found = (q == null || q.isBlank())
                ? customers.findAll(PageRequest.of(0, SEARCH_LIMIT, Sort.by("name"))).getContent()
                : customers.findByNameContainingIgnoreCaseOrAreaContainingIgnoreCase(q.trim(), q.trim()).stream().limit(SEARCH_LIMIT).toList();
        return found.stream().map(CustomerView::of).toList();
    }

    @PostMapping("/customers")
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    public CustomerView createCustomer(@Valid @RequestBody CreateCustomer in) {
        Customer c = new Customer();
        c.setName(in.name().trim());
        c.setPhone(in.phone().trim());
        c.setEmail(in.email().trim().toLowerCase());
        c.setAddress(in.address().trim());
        c.setArea(in.area() == null || in.area().isBlank() ? null : in.area().trim());
        customers.save(c);
        audit.record(CurrentUser.require(), "CREATE", "Customer", c.getId(), c.getName());
        return CustomerView.of(c);
    }

    @GetMapping("/technicians")
    public List<TechnicianView> technicians() {
        return technicians.list();
    }
}
