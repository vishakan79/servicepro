package com.fieldservicely.controller;

import com.fieldservicely.entity.Equipment;
import com.fieldservicely.entity.Role;
import com.fieldservicely.exception.ApiException;
import com.fieldservicely.repository.CustomerRepository;
import com.fieldservicely.repository.EquipmentRepository;
import com.fieldservicely.security.AuthUser;
import com.fieldservicely.security.CurrentUser;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** Equipment register. Staff manage it; a customer can only read their own equipment. */
@RestController
@RequestMapping("/api/equipment")
public class EquipmentController {

    public record EquipmentInput(@NotNull Long customerId, @NotBlank @Size(max = 120) String name, @Size(max = 60) String category,
                                 @Size(max = 120) String brandModel, @Size(max = 80) String serialNo, LocalDate installDate,
                                 LocalDate warrantyUntil, LocalDate amcUntil, LocalDate nextService, @Size(max = 500) String notes) {}

    public record EquipmentView(Long id, Long customerId, String customerName, String name, String category, String brandModel,
                                String serialNo, LocalDate installDate, LocalDate warrantyUntil, LocalDate amcUntil,
                                LocalDate nextService, String notes) {}

    private final EquipmentRepository repo;
    private final CustomerRepository customers;

    public EquipmentController(EquipmentRepository repo, CustomerRepository customers) {
        this.repo = repo;
        this.customers = customers;
    }

    @GetMapping
    public List<EquipmentView> list() {
        AuthUser me = CurrentUser.require();
        List<Equipment> rows;
        if (me.role() == Role.CUSTOMER) {
            rows = me.customerId() == null ? List.of() : repo.findByCustomerIdOrderByNextServiceAscIdDesc(me.customerId());
        } else if (me.role() == Role.ADMIN || me.role() == Role.MANAGER) {
            rows = repo.findAllByOrderByNextServiceAscIdDesc();
        } else {
            throw new ApiException.Forbidden("Not allowed");
        }
        return rows.stream().map(this::view).toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public EquipmentView create(@Valid @RequestBody EquipmentInput in) {
        return view(repo.save(apply(new Equipment(), in)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public EquipmentView update(@PathVariable Long id, @Valid @RequestBody EquipmentInput in) {
        Equipment e = repo.findById(id).orElseThrow(() -> new ApiException.NotFound("Equipment not found"));
        return view(repo.save(apply(e, in)));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public void delete(@PathVariable Long id) {
        if (!repo.existsById(id)) throw new ApiException.NotFound("Equipment not found");
        repo.deleteById(id);
    }

    private Equipment apply(Equipment e, EquipmentInput in) {
        if (!customers.existsById(in.customerId())) throw new ApiException.BadRequest("Customer not found");
        e.setCustomerId(in.customerId());
        e.setName(in.name().trim());
        e.setCategory(blank(in.category()));
        e.setBrandModel(blank(in.brandModel()));
        e.setSerialNo(blank(in.serialNo()));
        e.setInstallDate(in.installDate());
        e.setWarrantyUntil(in.warrantyUntil());
        e.setAmcUntil(in.amcUntil());
        e.setNextService(in.nextService());
        e.setNotes(blank(in.notes()));
        return e;
    }

    private static String blank(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }

    private EquipmentView view(Equipment e) {
        String cn = customers.findById(e.getCustomerId()).map(c -> c.getName()).orElse("");
        return new EquipmentView(e.getId(), e.getCustomerId(), cn, e.getName(), e.getCategory(), e.getBrandModel(), e.getSerialNo(),
                e.getInstallDate(), e.getWarrantyUntil(), e.getAmcUntil(), e.getNextService(), e.getNotes());
    }
}
