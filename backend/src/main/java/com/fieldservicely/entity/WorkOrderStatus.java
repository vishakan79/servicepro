package com.fieldservicely.entity;

import java.util.EnumSet;
import java.util.Set;

/** CREATED -> ASSIGNED -> EN_ROUTE -> IN_PROGRESS -> COMPLETED, with CANCELLED reachable from any open state. */
public enum WorkOrderStatus {
    CREATED, ASSIGNED, EN_ROUTE, IN_PROGRESS, COMPLETED, CANCELLED;

    public static final Set<WorkOrderStatus> ACTIVE = EnumSet.of(ASSIGNED, EN_ROUTE, IN_PROGRESS);
    public static final Set<WorkOrderStatus> OPEN = EnumSet.of(CREATED, ASSIGNED, EN_ROUTE, IN_PROGRESS);
    public static final Set<WorkOrderStatus> CLOSED = EnumSet.of(COMPLETED, CANCELLED);

    /** Statuses reachable through the status endpoint. ASSIGNED is only reachable via assign. */
    public Set<WorkOrderStatus> next() {
        return switch (this) {
            case CREATED -> EnumSet.of(CANCELLED);
            case ASSIGNED -> EnumSet.of(EN_ROUTE, CANCELLED);
            case EN_ROUTE -> EnumSet.of(IN_PROGRESS, CANCELLED);
            case IN_PROGRESS -> EnumSet.of(COMPLETED, CANCELLED);
            case COMPLETED, CANCELLED -> EnumSet.noneOf(WorkOrderStatus.class);
        };
    }

    public String label() {
        return switch (this) {
            case CREATED -> "Work Order Created";
            case ASSIGNED -> "Technician Assigned";
            case EN_ROUTE -> "Technician En Route";
            case IN_PROGRESS -> "Work in Progress";
            case COMPLETED -> "Work Completed";
            case CANCELLED -> "Work Order Cancelled";
        };
    }
}
