package com.fieldservicely.service;

import com.fieldservicely.dto.NotificationEvent;
import com.fieldservicely.entity.User;
import com.fieldservicely.entity.WorkOrder;
import com.fieldservicely.repository.UserRepository;
import com.fieldservicely.util.Codes;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/**
 * Pushes events to WebSocket subscribers and queues emails. Recipients are resolved inside the caller's transaction,
 * but nothing is sent until that transaction commits, so clients never see changes that were rolled back.
 */
@Service
public class NotificationService {

    private final SimpMessagingTemplate ws;
    private final UserRepository users;
    private final AsyncEmailService mail;

    public NotificationService(SimpMessagingTemplate ws, UserRepository users, AsyncEmailService mail) {
        this.ws = ws;
        this.users = users;
        this.mail = mail;
    }

    public void workOrderChanged(WorkOrder wo, String message) {
        NotificationEvent ev = new NotificationEvent("WORK_ORDER", wo.getId(), Codes.workOrder(wo.getId(), wo.getCreatedAt()),
                wo.getStatus().name(), message, Instant.now());
        List<String> userIds = new ArrayList<>();
        users.findByCustomerId(wo.getCustomerId()).forEach(u -> userIds.add(String.valueOf(u.getId())));
        if (wo.getTechnicianId() != null) {
            users.findByTechnicianId(wo.getTechnicianId()).forEach(u -> userIds.add(String.valueOf(u.getId())));
        }
        afterCommit(() -> {
            ws.convertAndSend("/topic/work-orders", ev);
            userIds.forEach(id -> ws.convertAndSendToUser(id, "/queue/notifications", ev));
        });
    }

    /** Staff-only alert, e.g. SLA breach or low stock. */
    public void staffAlert(String type, String message) {
        NotificationEvent ev = new NotificationEvent(type, null, null, null, message, Instant.now());
        afterCommit(() -> ws.convertAndSend("/topic/work-orders", ev));
    }

    public void email(String to, String subject, String body) {
        afterCommit(() -> mail.send(to, subject, body));
    }

    private static void afterCommit(Runnable action) {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    action.run();
                }
            });
        } else {
            action.run();
        }
    }
}
