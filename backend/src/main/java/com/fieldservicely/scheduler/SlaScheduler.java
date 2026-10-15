package com.fieldservicely.scheduler;

import com.fieldservicely.entity.WorkOrder;
import com.fieldservicely.entity.WorkOrderEvent;
import com.fieldservicely.entity.WorkOrderStatus;
import com.fieldservicely.repository.WorkOrderEventRepository;
import com.fieldservicely.repository.WorkOrderRepository;
import com.fieldservicely.service.AuditService;
import com.fieldservicely.service.NotificationService;
import com.fieldservicely.util.Codes;
import java.time.Instant;
import java.util.List;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/** Flags open work orders whose SLA deadline has passed. ShedLock keeps this to one instance at a time in a cluster. */
@Component
public class SlaScheduler {

    private static final Logger log = LoggerFactory.getLogger(SlaScheduler.class);

    private final WorkOrderRepository workOrders;
    private final WorkOrderEventRepository events;
    private final AuditService audit;
    private final NotificationService notifications;

    public SlaScheduler(WorkOrderRepository workOrders, WorkOrderEventRepository events, AuditService audit, NotificationService notifications) {
        this.workOrders = workOrders;
        this.events = events;
        this.audit = audit;
        this.notifications = notifications;
    }

    @Scheduled(fixedDelayString = "${app.sla.check-ms:60000}")
    @SchedulerLock(name = "slaBreachCheck", lockAtMostFor = "PT5M", lockAtLeastFor = "PT5S")
    @Transactional
    public void flagBreaches() {
        List<WorkOrder> late = workOrders.findBySlaBreachedFalseAndSlaDueAtBeforeAndStatusIn(Instant.now(), WorkOrderStatus.OPEN);
        for (WorkOrder w : late) {
            w.setSlaBreached(true);
            WorkOrderEvent e = new WorkOrderEvent();
            e.setWorkOrderId(w.getId());
            e.setLabel("SLA Breached");
            e.setActor("system");
            e.setAt(Instant.now());
            events.save(e);
            audit.record(null, "SLA_BREACH", "WorkOrder", w.getId(), "Due " + w.getSlaDueAt());
            String code = Codes.workOrder(w.getId(), w.getCreatedAt());
            notifications.staffAlert("SLA_BREACH", code + " (" + w.getPriority().name().toLowerCase() + " priority) is past its SLA deadline");
        }
        if (!late.isEmpty()) log.warn("Flagged {} work order(s) as SLA breached", late.size());
    }
}
