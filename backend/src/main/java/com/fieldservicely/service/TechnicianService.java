package com.fieldservicely.service;

import com.fieldservicely.dto.PeopleDtos.TechnicianView;
import com.fieldservicely.entity.Technician;
import com.fieldservicely.entity.WorkOrder;
import com.fieldservicely.entity.WorkOrderStatus;
import com.fieldservicely.repository.TechnicianRepository;
import com.fieldservicely.repository.WorkOrderRepository;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TechnicianService {

    private final TechnicianRepository technicians;
    private final WorkOrderRepository workOrders;

    public TechnicianService(TechnicianRepository technicians, WorkOrderRepository workOrders) {
        this.technicians = technicians;
        this.workOrders = workOrders;
    }

    @Transactional(readOnly = true)
    public List<TechnicianView> list() {
        return views(technicians.findAll());
    }

    @Transactional(readOnly = true)
    public List<TechnicianView> views(Collection<Technician> techs) {
        List<Long> ids = techs.stream().map(Technician::getId).toList();
        Map<Long, List<WorkOrder>> active = ids.isEmpty() ? Map.of()
                : workOrders.findByTechnicianIdInAndStatusIn(ids, WorkOrderStatus.ACTIVE).stream()
                        .collect(Collectors.groupingBy(WorkOrder::getTechnicianId));
        return techs.stream().map(t -> {
            List<WorkOrder> open = active.getOrDefault(t.getId(), List.of());
            boolean onJob = open.stream().anyMatch(w -> w.getStatus() == WorkOrderStatus.EN_ROUTE || w.getStatus() == WorkOrderStatus.IN_PROGRESS);
            String status = t.isOnLeave() ? "ON_LEAVE" : onJob ? "ON_DUTY" : "AVAILABLE";
            return new TechnicianView(t.getId(), t.getName(), t.getTitle(), t.skillList(), t.getRating(), t.getCompletedJobs(),
                    status, t.getPhone(), open.size());
        }).toList();
    }
}
