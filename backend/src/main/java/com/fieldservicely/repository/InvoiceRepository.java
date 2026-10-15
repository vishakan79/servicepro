package com.fieldservicely.repository;

import com.fieldservicely.entity.Invoice;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InvoiceRepository extends JpaRepository<Invoice, Long> {
    List<Invoice> findByCustomerIdOrderByIdDesc(Long customerId);

    List<Invoice> findAllByOrderByIdDesc();

    Page<Invoice> findByCustomerId(Long customerId, Pageable pageable);

    Optional<Invoice> findByWorkOrderId(Long workOrderId);
}
