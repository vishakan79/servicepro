package com.fieldservicely.repository;

import com.fieldservicely.entity.Technician;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TechnicianRepository extends JpaRepository<Technician, Long> {

    /** Row lock so two dispatchers cannot book the same technician slot concurrently. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select t from Technician t where t.id = :id")
    Optional<Technician> findByIdForUpdate(@Param("id") Long id);

    @Modifying
    @Query("update Technician t set t.completedJobs = t.completedJobs + 1 where t.id = :id")
    int incrementCompletedJobs(@Param("id") Long id);
}
