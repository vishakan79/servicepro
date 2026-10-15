package com.fieldservicely.repository;

import com.fieldservicely.entity.Feedback;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface FeedbackRepository extends JpaRepository<Feedback, Long> {
    Optional<Feedback> findByWorkOrderId(Long workOrderId);

    List<Feedback> findByWorkOrderIdIn(Collection<Long> workOrderIds);

    List<Feedback> findAllByOrderByCreatedAtDesc();

    Page<Feedback> findByCustomerId(Long customerId, Pageable pageable);

    @Query("select avg(f.stars) from Feedback f")
    Double averageStars();
}
