package com.fieldservicely.service;

import com.fieldservicely.entity.AuditLog;
import com.fieldservicely.repository.AuditLogRepository;
import com.fieldservicely.security.AuthUser;
import java.time.Instant;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Append-only audit trail. Runs in the caller's transaction so an audit row never outlives a rolled-back change. */
@Service
public class AuditService {

    private final AuditLogRepository repo;

    public AuditService(AuditLogRepository repo) {
        this.repo = repo;
    }

    @Transactional
    public void record(AuthUser actor, String action, String entity, Long entityId, String detail) {
        AuditLog log = new AuditLog();
        log.setActor(actor == null ? "system" : actor.email());
        log.setAction(action);
        log.setEntity(entity);
        log.setEntityId(entityId);
        log.setDetail(detail != null && detail.length() > 1000 ? detail.substring(0, 1000) : detail);
        log.setAt(Instant.now());
        repo.save(log);
    }
}
