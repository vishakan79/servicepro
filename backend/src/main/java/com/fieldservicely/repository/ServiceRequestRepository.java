package com.fieldservicely.repository;

import com.fieldservicely.entity.ServiceRequest;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface ServiceRequestRepository extends JpaRepository<ServiceRequest, Long> {
    List<ServiceRequest> findByCustomerIdOrderByIdDesc(Long customerId);

    List<ServiceRequest> findAllByOrderByIdDesc();

    Page<ServiceRequest> findByCustomerId(Long customerId, Pageable pageable);

    long countByCustomerId(Long customerId);

    @Query("select r.issueType, count(r) from ServiceRequest r group by r.issueType")
    List<Object[]> countByIssueType();
}
