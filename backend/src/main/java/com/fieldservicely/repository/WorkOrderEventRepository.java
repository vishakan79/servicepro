package com.fieldservicely.repository;

import com.fieldservicely.entity.WorkOrderEvent;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WorkOrderEventRepository extends JpaRepository<WorkOrderEvent, Long> {
    List<WorkOrderEvent> findByWorkOrderIdOrderByAtAscIdAsc(Long workOrderId);
}
