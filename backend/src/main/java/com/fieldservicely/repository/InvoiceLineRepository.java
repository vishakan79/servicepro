package com.fieldservicely.repository;

import com.fieldservicely.entity.InvoiceLine;
import com.fieldservicely.entity.InvoiceStatus;
import java.math.BigDecimal;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface InvoiceLineRepository extends JpaRepository<InvoiceLine, Long> {
    List<InvoiceLine> findByInvoiceIdIn(Collection<Long> invoiceIds);

    List<InvoiceLine> findByInvoiceId(Long invoiceId);

    /** Pre-tax total of all invoices in a status; null when there are none. */
    @Query("select sum(l.quantity * l.unitPrice) from InvoiceLine l where l.invoiceId in (select i.id from Invoice i where i.status = :status)")
    BigDecimal sumByInvoiceStatus(@Param("status") InvoiceStatus status);
}
