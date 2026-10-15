package com.fieldservicely.util;

import java.time.Instant;
import java.time.ZoneOffset;

/** Human-friendly document numbers derived from the primary key (race-free, no counters). */
public final class Codes {
    private Codes() {}

    public static String workOrder(Long id, Instant createdAt) { return format("WO", id, createdAt); }

    public static String request(Long id, Instant createdAt) { return format("SR", id, createdAt); }

    public static String invoice(Long id, Instant createdAt) { return format("INV", id, createdAt); }

    private static String format(String prefix, Long id, Instant createdAt) {
        int year = createdAt.atZone(ZoneOffset.UTC).getYear();
        return prefix + "-" + year + "-" + (1000 + id);
    }
}
