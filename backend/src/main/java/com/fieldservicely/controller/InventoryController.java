package com.fieldservicely.controller;

import com.fieldservicely.dto.PageResponse;
import com.fieldservicely.dto.PartDtos.CreatePart;
import com.fieldservicely.dto.PartDtos.PartView;
import com.fieldservicely.dto.PartDtos.RestockRequest;
import com.fieldservicely.dto.PartDtos.UpdatePart;
import com.fieldservicely.security.CurrentUser;
import com.fieldservicely.service.InventoryService;
import com.fieldservicely.util.Paging;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.data.domain.Sort;
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
@RequestMapping("/api/parts")
public class InventoryController {

    private final InventoryService service;

    public InventoryController(InventoryService service) {
        this.service = service;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','TECHNICIAN','INVENTORY_MANAGER')")
    public PageResponse<PartView> list(@RequestParam(required = false) String q, @RequestParam(required = false) String category,
                                       @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        return service.search(q, category, Paging.of(page, size, Sort.by("code")));
    }

    @GetMapping("/categories")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','TECHNICIAN','INVENTORY_MANAGER')")
    public List<String> categories() {
        return service.categories();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','INVENTORY_MANAGER')")
    public PartView create(@Valid @RequestBody CreatePart body) {
        return service.create(body, CurrentUser.require());
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','INVENTORY_MANAGER')")
    public PartView update(@PathVariable Long id, @Valid @RequestBody UpdatePart body) {
        return service.update(id, body, CurrentUser.require());
    }

    @PostMapping("/{id}/restock")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','INVENTORY_MANAGER')")
    public PartView restock(@PathVariable Long id, @Valid @RequestBody RestockRequest body) {
        return service.restock(id, body.quantity(), CurrentUser.require());
    }
}
