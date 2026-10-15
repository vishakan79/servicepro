package com.fieldservicely.repository;

import com.fieldservicely.entity.ChecklistItem;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ChecklistItemRepository extends JpaRepository<ChecklistItem, Long> {
    List<ChecklistItem> findByWorkOrderIdOrderBySortOrderAsc(Long workOrderId);

    List<ChecklistItem> findByWorkOrderIdIn(Collection<Long> workOrderIds);
}
