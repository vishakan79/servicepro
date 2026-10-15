package com.fieldservicely.service;

import com.fieldservicely.mail.EmailSender;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

/** Sends off the request thread; a mail outage must never fail or slow a business transaction. */
@Service
public class AsyncEmailService {
    private static final Logger log = LoggerFactory.getLogger(AsyncEmailService.class);

    private final EmailSender sender;

    public AsyncEmailService(EmailSender sender) {
        this.sender = sender;
    }

    @Async
    public void send(String to, String subject, String body) {
        try {
            sender.send(to, subject, body);
        } catch (RuntimeException e) {
            log.error("Failed to send email to {}: {}", to, e.getMessage());
        }
    }
}
