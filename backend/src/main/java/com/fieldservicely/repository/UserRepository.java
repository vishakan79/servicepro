package com.fieldservicely.repository;

import com.fieldservicely.entity.User;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmailIgnoreCase(String email);

    List<User> findByCustomerId(Long customerId);

    List<User> findByTechnicianId(Long technicianId);

    boolean existsByEmailIgnoreCase(String email);

    Optional<User> findByPhone(String phone);

    boolean existsByPhone(String phone);
}
