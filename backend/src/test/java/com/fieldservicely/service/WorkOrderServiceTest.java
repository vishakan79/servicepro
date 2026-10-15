package com.fieldservicely.service;

import com.fieldservicely.dto.WorkOrderDtos.AssignRequest;
import com.fieldservicely.dto.WorkOrderDtos.CreateRequest;
import com.fieldservicely.dto.WorkOrderDtos.PartRequest;
import com.fieldservicely.entity.ChecklistItem;
import com.fieldservicely.entity.Part;
import com.fieldservicely.entity.Priority;
import com.fieldservicely.entity.Role;
import com.fieldservicely.entity.Technician;
import com.fieldservicely.entity.WorkOrder;
import com.fieldservicely.entity.WorkOrderStatus;
import com.fieldservicely.exception.ApiException;
import com.fieldservicely.mapper.WorkOrderMapper;
import com.fieldservicely.repository.ChecklistItemRepository;
import com.fieldservicely.repository.CustomerRepository;
import com.fieldservicely.repository.FeedbackRepository;
import com.fieldservicely.repository.PartRepository;
import com.fieldservicely.repository.PartUsageRepository;
import com.fieldservicely.repository.ServiceRequestRepository;
import com.fieldservicely.repository.TechnicianRepository;
import com.fieldservicely.repository.WorkLogRepository;
import com.fieldservicely.repository.WorkOrderEventRepository;
import com.fieldservicely.repository.WorkOrderRepository;
import com.fieldservicely.security.AuthUser;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WorkOrderServiceTest {

    @Mock WorkOrderRepository workOrders;
    @Mock ServiceRequestRepository requests;
    @Mock WorkOrderEventRepository events;
    @Mock ChecklistItemRepository checklist;
    @Mock WorkLogRepository logs;
    @Mock PartUsageRepository usages;
    @Mock PartRepository parts;
    @Mock CustomerRepository customers;
    @Mock TechnicianRepository technicians;
    @Mock TechnicianService technicianService;
    @Mock FeedbackRepository feedback;
    @Mock BillingService billing;
    @Mock WorkOrderMapper mapper;
    @Mock AuditService audit;
    @Mock NotificationService notifications;

    WorkOrderService service;

    final AuthUser admin = new AuthUser(1L, "Admin", "admin@fs.com", Role.ADMIN, null, null);
    final AuthUser customer = new AuthUser(4L, "Ravi", "ravi@fs.com", Role.CUSTOMER, 10L, null);
    final AuthUser tech = new AuthUser(3L, "Karthik", "k@fs.com", Role.TECHNICIAN, null, 7L);

    @BeforeEach
    void setUp() {
        service = new WorkOrderService(workOrders, requests, events, checklist, logs, usages, parts, customers, technicians,
                technicianService, feedback, billing, mapper, audit, notifications);
    }

    private WorkOrder order(WorkOrderStatus status) {
        WorkOrder w = new WorkOrder();
        w.setId(1L);
        w.setRequestId(1L);
        w.setCustomerId(10L);
        w.setTechnicianId(7L);
        w.setStatus(status);
        w.setPriority(Priority.MEDIUM);
        w.setServiceType("Plumbing");
        w.setScheduledDate(LocalDate.now(ZoneOffset.UTC).plusDays(1));
        w.setStartHour(10);
        w.setDurationHours(2);
        w.setSlaDueAt(Instant.now().plusSeconds(3600));
        w.setCreatedAt(Instant.now());
        return w;
    }

    @Test
    void customerCannotSeeAnotherCustomersWorkOrder() {
        WorkOrder other = order(WorkOrderStatus.ASSIGNED);
        other.setCustomerId(99L);
        when(workOrders.findById(1L)).thenReturn(Optional.of(other));
        assertThatThrownBy(() -> service.detail(1L, customer)).isInstanceOf(ApiException.NotFound.class);
    }

    @Test
    void technicianCannotSeeAnotherTechniciansJob() {
        WorkOrder other = order(WorkOrderStatus.ASSIGNED);
        other.setTechnicianId(8L);
        when(workOrders.findById(1L)).thenReturn(Optional.of(other));
        assertThatThrownBy(() -> service.changeStatus(1L, WorkOrderStatus.EN_ROUTE, tech)).isInstanceOf(ApiException.NotFound.class);
    }

    @Test
    void customerCannotChangeStatus() {
        when(workOrders.findById(1L)).thenReturn(Optional.of(order(WorkOrderStatus.ASSIGNED)));
        assertThatThrownBy(() -> service.changeStatus(1L, WorkOrderStatus.CANCELLED, customer)).isInstanceOf(ApiException.Forbidden.class);
    }

    @Test
    void technicianCannotCancel() {
        when(workOrders.findById(1L)).thenReturn(Optional.of(order(WorkOrderStatus.ASSIGNED)));
        assertThatThrownBy(() -> service.changeStatus(1L, WorkOrderStatus.CANCELLED, tech)).isInstanceOf(ApiException.Forbidden.class);
    }

    @Test
    void rejectsSkippingAStep() {
        when(workOrders.findById(1L)).thenReturn(Optional.of(order(WorkOrderStatus.ASSIGNED)));
        assertThatThrownBy(() -> service.changeStatus(1L, WorkOrderStatus.COMPLETED, admin))
                .isInstanceOf(ApiException.Conflict.class).hasMessageContaining("ASSIGNED");
        verify(workOrders, never()).save(any());
    }

    @Test
    void cannotCompleteWhileChecklistHasOpenItems() {
        ChecklistItem open = new ChecklistItem();
        open.setDone(false);
        when(workOrders.findById(1L)).thenReturn(Optional.of(order(WorkOrderStatus.IN_PROGRESS)));
        when(checklist.findByWorkOrderIdOrderBySortOrderAsc(1L)).thenReturn(List.of(open));
        assertThatThrownBy(() -> service.changeStatus(1L, WorkOrderStatus.COMPLETED, tech)).isInstanceOf(ApiException.BadRequest.class);
        verify(billing, never()).createForWorkOrder(any());
    }

    @Test
    void techniciansCannotCreateRequests() {
        assertThatThrownBy(() -> service.createRequest(new CreateRequest(1L, "Plumbing", Priority.LOW, "Leak", 0), tech))
                .isInstanceOf(ApiException.Forbidden.class);
    }

    @Test
    void staffMustNameTheCustomer() {
        assertThatThrownBy(() -> service.createRequest(new CreateRequest(null, "Plumbing", Priority.LOW, "Leak", 0), admin))
                .isInstanceOf(ApiException.BadRequest.class);
    }

    @Test
    void cannotAssignInThePast() {
        WorkOrder w = order(WorkOrderStatus.CREATED);
        when(workOrders.findById(1L)).thenReturn(Optional.of(w));
        AssignRequest in = new AssignRequest(7L, LocalDate.now(ZoneOffset.UTC).minusDays(1), 10, 2, null);
        assertThatThrownBy(() -> service.assign(1L, in, admin)).isInstanceOf(ApiException.BadRequest.class);
    }

    @Test
    void cannotDoubleBookATechnician() {
        WorkOrder w = order(WorkOrderStatus.CREATED);
        Technician t = new Technician();
        t.setId(7L);
        t.setName("Karthik");
        t.setOnLeave(false);
        LocalDate date = LocalDate.now(ZoneOffset.UTC).plusDays(2);
        when(workOrders.findById(1L)).thenReturn(Optional.of(w));
        when(technicians.findByIdForUpdate(7L)).thenReturn(Optional.of(t));
        when(workOrders.hasClash(eq(1L), eq(7L), eq(date), any(), anyInt(), anyInt())).thenReturn(true);
        assertThatThrownBy(() -> service.assign(1L, new AssignRequest(7L, date, 10, 2, null), admin))
                .isInstanceOf(ApiException.Conflict.class).hasMessageContaining("already has a job");
        verify(workOrders, never()).save(any());
    }

    @Test
    void cannotAssignATechnicianOnLeave() {
        Technician t = new Technician();
        t.setId(7L);
        t.setName("Arun");
        t.setOnLeave(true);
        when(workOrders.findById(1L)).thenReturn(Optional.of(order(WorkOrderStatus.CREATED)));
        when(technicians.findByIdForUpdate(7L)).thenReturn(Optional.of(t));
        assertThatThrownBy(() -> service.assign(1L, new AssignRequest(7L, LocalDate.now(ZoneOffset.UTC).plusDays(2), 10, 2, null), admin))
                .isInstanceOf(ApiException.BadRequest.class).hasMessageContaining("on leave");
    }

    @Test
    void insufficientStockIsRefusedAndNothingIsRecorded() {
        Part p = new Part();
        p.setId(5L);
        p.setName("Air Filter");
        p.setStock(1);
        when(workOrders.findById(1L)).thenReturn(Optional.of(order(WorkOrderStatus.IN_PROGRESS)));
        when(parts.findById(5L)).thenReturn(Optional.of(p));
        when(parts.decrementStock(5L, 3)).thenReturn(0);
        assertThatThrownBy(() -> service.addPart(1L, new PartRequest(5L, 3), tech))
                .isInstanceOf(ApiException.Conflict.class).hasMessageContaining("in stock");
        verify(usages, never()).save(any());
    }

    @Test
    void partsCannotBeRecordedBeforeAssignment() {
        when(workOrders.findById(1L)).thenReturn(Optional.of(order(WorkOrderStatus.CREATED)));
        assertThatThrownBy(() -> service.addPart(1L, new PartRequest(5L, 1), admin)).isInstanceOf(ApiException.Conflict.class);
        verify(parts, never()).decrementStock(any(), anyInt());
    }

    @Test
    void closedOrdersRejectNewParts() {
        when(workOrders.findById(1L)).thenReturn(Optional.of(order(WorkOrderStatus.COMPLETED)));
        assertThat(WorkOrderStatus.OPEN).doesNotContain(WorkOrderStatus.COMPLETED);
        assertThatThrownBy(() -> service.addPart(1L, new PartRequest(5L, 1), admin)).isInstanceOf(ApiException.Conflict.class);
    }
}
