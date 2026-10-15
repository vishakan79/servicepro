package com.fieldservicely.controller;

import com.fieldservicely.dto.AuthDtos.InviteUser;
import com.fieldservicely.dto.AuthDtos.UserView;
import com.fieldservicely.dto.PageResponse;
import com.fieldservicely.entity.AuditLog;
import com.fieldservicely.repository.AuditLogRepository;
import com.fieldservicely.repository.UserRepository;
import com.fieldservicely.security.CurrentUser;
import com.fieldservicely.service.UserAdminService;
import com.fieldservicely.util.Paging;
import jakarta.validation.Valid;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Admin-only: user directory and the append-only audit trail. */
@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final UserRepository users;
    private final AuditLogRepository audit;
    private final UserAdminService admin;

    public AdminController(UserRepository users, AuditLogRepository audit, UserAdminService admin) {
        this.users = users;
        this.audit = audit;
        this.admin = admin;
    }

    @PostMapping("/users")
    @ResponseStatus(HttpStatus.CREATED)
    public UserView invite(@Valid @RequestBody InviteUser in) {
        return admin.invite(in, CurrentUser.require());
    }

    @PostMapping("/users/{id}/approve")
    public UserView approve(@PathVariable Long id) {
        return admin.approve(id, CurrentUser.require());
    }

    @PostMapping("/users/{id}/enable")
    public UserView enable(@PathVariable Long id) {
        return admin.setEnabled(id, true, CurrentUser.require());
    }

    @PostMapping("/users/{id}/disable")
    public UserView disable(@PathVariable Long id) {
        return admin.setEnabled(id, false, CurrentUser.require());
    }

    @GetMapping("/users")
    @Transactional(readOnly = true)
    public PageResponse<UserView> users(@RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        return PageResponse.of(users.findAll(Paging.of(page, size, Sort.by("id"))), UserView::of);
    }

    @GetMapping("/audit")
    @Transactional(readOnly = true)
    public PageResponse<AuditLog> audit(@RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "50") int size) {
        return PageResponse.of(audit.findAll(Paging.of(page, size, Sort.by(Sort.Direction.DESC, "at", "id"))), a -> a);
    }
}
