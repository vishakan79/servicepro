package com.fieldservicely.repository;

import com.fieldservicely.entity.WorkOrder;
import com.fieldservicely.entity.WorkOrderStatus;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface WorkOrderRepository extends JpaRepository<WorkOrder, Long>, JpaSpecificationExecutor<WorkOrder> {

    @Query("select count(w) > 0 from WorkOrder w where w.id <> :id and w.technicianId = :tech and w.scheduledDate = :date "
            + "and w.status in :active and :start < w.startHour + w.durationHours and w.startHour < :end")
    boolean hasClash(@Param("id") Long id, @Param("tech") Long tech, @Param("date") LocalDate date,
                     @Param("active") Collection<WorkOrderStatus> active, @Param("start") int start, @Param("end") int end);

    long countByTechnicianIdAndScheduledDateAndStatusIn(Long technicianId, LocalDate date, Collection<WorkOrderStatus> statuses);

    List<WorkOrder> findByTechnicianIdInAndStatusIn(Collection<Long> technicianIds, Collection<WorkOrderStatus> statuses);

    List<WorkOrder> findByRequestId(Long requestId);

    List<WorkOrder> findBySlaBreachedFalseAndSlaDueAtBeforeAndStatusIn(Instant cutoff, Collection<WorkOrderStatus> statuses);

    List<WorkOrder> findByCreatedAtAfter(Instant since);

    @Query("select w.status, count(w) from WorkOrder w group by w.status")
    List<Object[]> countByStatus();
}
