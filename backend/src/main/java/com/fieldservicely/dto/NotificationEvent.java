package com.fieldservicely.dto;

import java.time.Instant;

public record NotificationEvent(String type, Long workOrderId, String code, String status, String message, Instant at) {}
