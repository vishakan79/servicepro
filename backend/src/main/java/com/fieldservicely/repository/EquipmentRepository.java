package com.fieldservicely.repository;

import com.fieldservicely.entity.Equipment;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EquipmentRepository extends JpaRepository<Equipment, Long> {
    List<Equipment> findAllByOrderByNextServiceAscIdDesc();

    List<Equipment> findByCustomerIdOrderByNextServiceAscIdDesc(Long customerId);
}
