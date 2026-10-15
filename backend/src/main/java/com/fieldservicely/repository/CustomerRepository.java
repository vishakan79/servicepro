package com.fieldservicely.repository;

import com.fieldservicely.entity.Customer;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CustomerRepository extends JpaRepository<Customer, Long> {
    List<Customer> findByNameContainingIgnoreCaseOrAreaContainingIgnoreCase(String name, String area);

    List<Customer> findByIdIn(Collection<Long> ids);
}
