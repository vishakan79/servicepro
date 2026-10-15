package com.fieldservicely.repository;

import com.fieldservicely.entity.WorkLog;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WorkLogRepository extends JpaRepository<WorkLog, Long> {
    List<WorkLog> findByWorkOrderIdOrderByAtDesc(Long workOrderId);
}
