package com.fieldservicely.service;

import com.fieldservicely.dto.AuthDtos.InviteUser;
import com.fieldservicely.dto.AuthDtos.UserView;
import com.fieldservicely.entity.Role;
import com.fieldservicely.entity.Technician;
import com.fieldservicely.entity.User;
import com.fieldservicely.exception.ApiException;
import com.fieldservicely.repository.RefreshTokenRepository;
import com.fieldservicely.repository.TechnicianRepository;
import com.fieldservicely.repository.UserRepository;
import com.fieldservicely.security.AuthUser;
import com.fieldservicely.util.PhoneNumbers;
import java.math.BigDecimal;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Administrator actions on accounts: invite staff, approve self-registered staff, enable or disable. */
@Service
public class UserAdminService {

    private final UserRepository users;
    private final TechnicianRepository technicians;
    private final RefreshTokenRepository refreshTokens;
    private final AuditService audit;
    private final PasswordEncoder encoder;

    public UserAdminService(UserRepository users, TechnicianRepository technicians, RefreshTokenRepository refreshTokens, AuditService audit,
                            PasswordEncoder encoder) {
        this.encoder = encoder;
        this.users = users;
        this.technicians = technicians;
        this.refreshTokens = refreshTokens;
        this.audit = audit;
    }

    /** Staff accounts can be created by an administrator, who sets a first password to hand over. */
    @Transactional
    public UserView invite(InviteUser in, AuthUser actor) {
        if (in.role() == Role.CUSTOMER) {
            throw new ApiException.BadRequest("Customers register themselves from the sign-up page");
        }
        String email = in.email().trim().toLowerCase();
        String phone = PhoneNumbers.normalize(in.phone());
        if (users.existsByEmailIgnoreCase(email)) throw new ApiException.Conflict("An account with this email already exists");
        if (users.existsByPhone(phone)) throw new ApiException.Conflict("An account with this mobile number already exists");
        User u = new User();
        u.setName(in.name().trim());
        u.setEmail(email);
        u.setPhone(phone);
        u.setPasswordHash(encoder.encode(in.password()));
        u.setRole(in.role());
        u.setEnabled(true);
        linkTechnician(u);
        users.save(u);
        audit.record(actor, "INVITE", "User", u.getId(), u.getEmail() + " as " + u.getRole());
        return UserView.of(u);
    }

    @Transactional
    public UserView approve(Long id, AuthUser actor) {
        User u = find(id);
        if (!u.isApprovalPending()) throw new ApiException.BadRequest("This account is not waiting for approval");
        u.setApprovalPending(false);
        u.setEnabled(true);
        linkTechnician(u);
        audit.record(actor, "APPROVE", "User", u.getId(), u.getEmail());
        return UserView.of(u);
    }

    @Transactional
    public UserView setEnabled(Long id, boolean enabled, AuthUser actor) {
        User u = find(id);
        if (!enabled && u.getId().equals(actor.id())) throw new ApiException.BadRequest("You cannot disable your own account");
        if (enabled && u.isApprovalPending()) throw new ApiException.BadRequest("Approve this account instead");
        u.setEnabled(enabled);
        if (!enabled) refreshTokens.revokeAllForUser(u.getId());
        audit.record(actor, enabled ? "ENABLE" : "DISABLE", "User", u.getId(), u.getEmail());
        return UserView.of(u);
    }

    private User find(Long id) {
        return users.findById(id).orElseThrow(() -> new ApiException.NotFound("User not found"));
    }

    /** A technician login needs a technician record to be assignable; skills default to all so dispatch can use them at once. */
    private void linkTechnician(User u) {
        if (u.getRole() != Role.TECHNICIAN || u.getTechnicianId() != null) return;
        Technician t = new Technician();
        t.setName(u.getName());
        t.setTitle("Technician");
        t.setSkills("AC,Electrical,Plumbing,Appliance");
        t.setRating(new BigDecimal("0.0"));
        t.setCompletedJobs(0);
        t.setOnLeave(false);
        t.setPhone(u.getPhone() == null ? "" : u.getPhone());
        technicians.save(t);
        u.setTechnicianId(t.getId());
    }
}
