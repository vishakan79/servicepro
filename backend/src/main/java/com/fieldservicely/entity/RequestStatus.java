package com.fieldservicely.entity;


public enum RequestStatus {
    NEW, SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED;

    public static RequestStatus from(WorkOrderStatus s) {
        return switch (s) {
            case CREATED -> NEW;
            case ASSIGNED -> SCHEDULED;
            case EN_ROUTE, IN_PROGRESS -> IN_PROGRESS;
            case COMPLETED -> COMPLETED;
            case CANCELLED -> CANCELLED;
        };
    }
}
