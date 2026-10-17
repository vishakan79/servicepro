package com.fieldservicely.util;

import com.fieldservicely.entity.WorkOrder;
import com.fieldservicely.security.AuthUser;
import java.util.Objects;
import org.springframework.data.jpa.domain.Specification;

/** Row-level access rules. Staff see everything; customers and technicians see only their own work orders. */
public final class WorkOrderScopes {
    private WorkOrderScopes() {}

    public static Specification<WorkOrder> of(AuthUser u) {
        return (root, query, cb) -> switch (u.role()) {
            case ADMIN, MANAGER -> cb.conjunction();
            case CUSTOMER -> u.customerId() == null ? cb.disjunction() : cb.equal(root.get("customerId"), u.customerId());
            case TECHNICIAN -> u.technicianId() == null ? cb.disjunction() : cb.equal(root.get("technicianId"), u.technicianId());
            case INVENTORY_MANAGER -> cb.disjunction();
        };
    }

    public static boolean canView(WorkOrder w, AuthUser u) {
        return switch (u.role()) {
            case ADMIN, MANAGER -> true;
            case CUSTOMER -> u.customerId() != null && Objects.equals(w.getCustomerId(), u.customerId());
            case TECHNICIAN -> u.technicianId() != null && Objects.equals(w.getTechnicianId(), u.technicianId());
            case INVENTORY_MANAGER -> false;
        };
    }
}
