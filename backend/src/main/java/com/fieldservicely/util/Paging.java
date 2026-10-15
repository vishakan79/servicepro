package com.fieldservicely.util;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

/** Every list endpoint is paged and capped, so one request can never pull a whole table. */
public final class Paging {
    public static final int MAX_SIZE = 100;

    private Paging() {}

    public static Pageable of(int page, int size, Sort sort) {
        return PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), MAX_SIZE), sort);
    }
}
