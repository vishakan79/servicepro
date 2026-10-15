package com.fieldservicely.service;

import com.fieldservicely.dto.PageResponse;
import com.fieldservicely.dto.PartDtos.CreatePart;
import com.fieldservicely.dto.PartDtos.PartView;
import com.fieldservicely.entity.Part;
import com.fieldservicely.exception.ApiException;
import com.fieldservicely.repository.PartRepository;
import com.fieldservicely.security.AuthUser;
import java.util.ArrayList;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class InventoryService {

    private final PartRepository parts;
    private final AuditService audit;

    public InventoryService(PartRepository parts, AuditService audit) {
        this.parts = parts;
        this.audit = audit;
    }

    @Transactional(readOnly = true)
    public PageResponse<PartView> search(String q, String category, Pageable pageable) {
        Specification<Part> spec = (r, query, cb) -> cb.conjunction();
        if (q != null && !q.isBlank()) {
            String like = "%" + escape(q.trim().toLowerCase()) + "%";
            spec = spec.and((r, query, cb) -> cb.or(
                    cb.like(cb.lower(r.get("name")), like, '\\'),
                    cb.like(cb.lower(r.get("code")), like, '\\'),
                    cb.like(cb.lower(r.get("brand")), like, '\\')));
        }
        if (category != null && !category.isBlank()) {
            spec = spec.and((r, query, cb) -> cb.equal(r.get("category"), category));
        }
        Page<Part> page = parts.findAll(spec, pageable);
        return PageResponse.of(page, PartView::of);
    }

    @Transactional(readOnly = true)
    public List<String> categories() {
        return new ArrayList<>(parts.findAll().stream().map(Part::getCategory).distinct().sorted().toList());
    }

    @Transactional
    public PartView create(CreatePart in, AuthUser u) {
        Part p = new Part();
        p.setCode(in.code().trim().toUpperCase());
        p.setName(in.name().trim());
        p.setCategory(in.category().trim());
        p.setBrand(in.brand().trim());
        p.setStock(in.stock());
        p.setReorderLevel(in.reorderLevel());
        p.setUnitPrice(in.unitPrice());
        parts.save(p);
        audit.record(u, "CREATE", "Part", p.getId(), p.getCode());
        return PartView.of(p);
    }

    @Transactional
    public PartView restock(Long id, int quantity, AuthUser u) {
        if (parts.incrementStock(id, quantity) == 0) throw new ApiException.NotFound("Part not found");
        audit.record(u, "RESTOCK", "Part", id, "+" + quantity);
        return PartView.of(parts.findById(id).orElseThrow(() -> new ApiException.NotFound("Part not found")));
    }

    private static String escape(String s) {
        return s.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
    }
}
