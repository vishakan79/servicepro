package com.fieldservicely.entity;

import com.fieldservicely.util.SkillCatalog;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class DomainRulesTest {

    @Test
    void completedAndCancelledAreTerminal() {
        assertThat(WorkOrderStatus.COMPLETED.next()).isEmpty();
        assertThat(WorkOrderStatus.CANCELLED.next()).isEmpty();
    }

    @Test
    void happyPathIsLinearAndAssignedOnlyComesFromAssign() {
        assertThat(WorkOrderStatus.CREATED.next()).containsOnly(WorkOrderStatus.CANCELLED);
        assertThat(WorkOrderStatus.ASSIGNED.next()).containsOnly(WorkOrderStatus.EN_ROUTE, WorkOrderStatus.CANCELLED);
        assertThat(WorkOrderStatus.EN_ROUTE.next()).containsOnly(WorkOrderStatus.IN_PROGRESS, WorkOrderStatus.CANCELLED);
        assertThat(WorkOrderStatus.IN_PROGRESS.next()).containsOnly(WorkOrderStatus.COMPLETED, WorkOrderStatus.CANCELLED);
        for (WorkOrderStatus s : WorkOrderStatus.values()) {
            assertThat(s.next()).doesNotContain(WorkOrderStatus.ASSIGNED);
        }
    }

    @Test
    void requestStatusFollowsWorkOrderStatus() {
        assertThat(RequestStatus.from(WorkOrderStatus.CREATED)).isEqualTo(RequestStatus.NEW);
        assertThat(RequestStatus.from(WorkOrderStatus.ASSIGNED)).isEqualTo(RequestStatus.SCHEDULED);
        assertThat(RequestStatus.from(WorkOrderStatus.EN_ROUTE)).isEqualTo(RequestStatus.IN_PROGRESS);
        assertThat(RequestStatus.from(WorkOrderStatus.COMPLETED)).isEqualTo(RequestStatus.COMPLETED);
    }

    @Test
    void higherPriorityHasTighterSla() {
        assertThat(Priority.HIGH.slaHours()).isLessThan(Priority.MEDIUM.slaHours());
        assertThat(Priority.MEDIUM.slaHours()).isLessThan(Priority.LOW.slaHours());
    }

    @Test
    void everyIssueTypeHasSkillsAndAChecklist() {
        for (String type : SkillCatalog.issueTypes()) {
            assertThat(SkillCatalog.SKILLS.get(type)).isNotEmpty();
            assertThat(SkillCatalog.CHECKLISTS.get(type)).hasSizeGreaterThanOrEqualTo(3);
        }
    }

    @Test
    void stockStateReflectsReorderLevel() {
        Part p = new Part();
        p.setReorderLevel(10);
        p.setStock(0);
        assertThat(p.stockState()).isEqualTo("OUT_OF_STOCK");
        p.setStock(10);
        assertThat(p.stockState()).isEqualTo("LOW_STOCK");
        p.setStock(11);
        assertThat(p.stockState()).isEqualTo("IN_STOCK");
    }

    @Test
    void pendingInvoicePastDueIsReportedOverdue() {
        Invoice inv = new Invoice();
        inv.setStatus(InvoiceStatus.PENDING);
        inv.setDueOn(LocalDate.of(2026, 1, 10));
        assertThat(inv.effectiveStatus(LocalDate.of(2026, 1, 11))).isEqualTo(InvoiceStatus.OVERDUE);
        assertThat(inv.effectiveStatus(LocalDate.of(2026, 1, 10))).isEqualTo(InvoiceStatus.PENDING);
        inv.setStatus(InvoiceStatus.PAID);
        assertThat(inv.effectiveStatus(LocalDate.of(2026, 3, 1))).isEqualTo(InvoiceStatus.PAID);
    }
}
