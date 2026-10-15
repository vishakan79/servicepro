package com.fieldservicely.mapper;

import com.fieldservicely.dto.WorkOrderDtos.RequestView;
import com.fieldservicely.dto.WorkOrderDtos.WorkOrderSummary;
import com.fieldservicely.entity.Customer;
import com.fieldservicely.entity.ServiceRequest;
import com.fieldservicely.entity.Technician;
import com.fieldservicely.entity.WorkOrder;
import com.fieldservicely.repository.CustomerRepository;
import com.fieldservicely.repository.TechnicianRepository;
import com.fieldservicely.repository.WorkOrderRepository;
import com.fieldservicely.util.Codes;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;

/** Builds list views with two batched lookups instead of one query per row. */
@Component
public class WorkOrderMapper {

    private final CustomerRepository customers;
    private final TechnicianRepository technicians;
    private final WorkOrderRepository workOrders;

    public WorkOrderMapper(CustomerRepository customers, TechnicianRepository technicians, WorkOrderRepository workOrders) {
        this.customers = customers;
        this.technicians = technicians;
        this.workOrders = workOrders;
    }

    public List<WorkOrderSummary> summaries(Collection<WorkOrder> list) {
        Map<Long, Customer> cust = byId(customers.findByIdIn(ids(list, WorkOrder::getCustomerId)), Customer::getId);
        Set<Long> techIds = ids(list, WorkOrder::getTechnicianId);
        Map<Long, Technician> tech = techIds.isEmpty() ? Map.of() : byId(technicians.findAllById(techIds), Technician::getId);
        return list.stream().map(w -> summary(w, cust.get(w.getCustomerId()), w.getTechnicianId() == null ? null : tech.get(w.getTechnicianId()))).toList();
    }

    public WorkOrderSummary summary(WorkOrder w, Customer c, Technician t) {
        return new WorkOrderSummary(w.getId(), Codes.workOrder(w.getId(), w.getCreatedAt()), w.getCustomerId(), c == null ? null : c.getName(),
                w.getServiceType(), w.getPriority(), w.getStatus(), w.getTechnicianId(), t == null ? null : t.getName(),
                w.getScheduledDate(), w.getStartHour(), w.getDurationHours(), w.getSlaDueAt(), w.isSlaBreached());
    }

    public List<RequestView> requests(Collection<ServiceRequest> list) {
        Map<Long, Customer> cust = byId(customers.findByIdIn(ids(list, ServiceRequest::getCustomerId)), Customer::getId);
        Map<Long, WorkOrder> byRequest = list.isEmpty() ? Map.of()
                : workOrders.findAll((root, q, cb) -> root.get("requestId").in(list.stream().map(ServiceRequest::getId).toList())).stream()
                        .collect(Collectors.toMap(WorkOrder::getRequestId, Function.identity(), (a, b) -> a));
        return list.stream().map(r -> {
            WorkOrder w = byRequest.get(r.getId());
            Customer c = cust.get(r.getCustomerId());
            return new RequestView(r.getId(), Codes.request(r.getId(), r.getCreatedAt()), r.getCustomerId(), c == null ? null : c.getName(),
                    r.getIssueType(), r.getPriority(), r.getStatus(), r.getDescription(), r.getCreatedAt(), r.getCreatedBy(),
                    r.getImageCount(), w == null ? null : w.getId(), w == null ? null : Codes.workOrder(w.getId(), w.getCreatedAt()));
        }).toList();
    }

    private static <E> Set<Long> ids(Collection<E> list, Function<E, Long> f) {
        return list.stream().map(f).filter(java.util.Objects::nonNull).collect(Collectors.toSet());
    }

    private static <E> Map<Long, E> byId(Collection<E> list, Function<E, Long> f) {
        return list.stream().collect(Collectors.toMap(f, Function.identity()));
    }
}
