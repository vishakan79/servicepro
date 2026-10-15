package com.fieldservicely.service;

import com.fieldservicely.dto.InquiryDtos.CreateInquiry;
import com.fieldservicely.dto.InquiryDtos.InquiryReceipt;
import com.fieldservicely.dto.InquiryDtos.InquiryView;
import com.fieldservicely.dto.PageResponse;
import com.fieldservicely.entity.Inquiry;
import com.fieldservicely.exception.ApiException;
import com.fieldservicely.repository.InquiryRepository;
import com.fieldservicely.security.LoginRateLimiter;
import com.fieldservicely.util.Paging;
import java.time.Instant;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class InquiryService {

    private static final Logger log = LoggerFactory.getLogger(InquiryService.class);

    private final InquiryRepository inquiries;
    private final LoginRateLimiter limiter;

    public InquiryService(InquiryRepository inquiries, LoginRateLimiter limiter) {
        this.inquiries = inquiries;
        this.limiter = limiter;
    }

    /** Public endpoint: limited per client IP (same window as login attempts) so it cannot be used to flood the table. */
    @Transactional
    public InquiryReceipt create(CreateInquiry in, String clientIp) {
        String key = "inquiry|" + clientIp;
        if (limiter.isBlocked(key)) {
            throw new ApiException.TooManyRequests("Too many requests. Please try again later.");
        }
        limiter.recordFailure(key); // counts every submission, not only failures
        if (in.website() != null && !in.website().isBlank()) {
            return new InquiryReceipt(0L); // honeypot filled: pretend success, store nothing
        }
        Inquiry i = new Inquiry();
        i.setName(in.name().trim());
        i.setEmail(in.email().trim().toLowerCase());
        i.setCompany(blankToNull(in.company()));
        i.setPhone(blankToNull(in.phone()));
        i.setInterest(blankToNull(in.interest()));
        i.setMessage(in.message().trim());
        i.setCreatedAt(Instant.now());
        inquiries.save(i);
        log.info("New website inquiry {}", i.getId());
        return new InquiryReceipt(i.getId());
    }

    @Transactional(readOnly = true)
    public PageResponse<InquiryView> list(int page, int size) {
        return PageResponse.of(inquiries.findAll(Paging.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt", "id"))), InquiryView::of);
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
