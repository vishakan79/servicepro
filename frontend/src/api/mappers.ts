import { Customer, Invoice, Part, Priority, RequestStatus, Role, ServiceRequest, Technician, TechStatus, User, WOStatus, WorkOrder } from '../types'

// ---- backend DTOs (shapes copied from the Spring records) ----
export interface UserDto { id: number; name: string; email: string; phone?: string | null; enabled?: boolean; approvalPending?: boolean; role: string; customerId?: number | null; technicianId?: number | null }
export interface CustomerDto { id: number; name: string; phone: string; email: string; address: string; area?: string | null }
export interface TechnicianDto { id: number; name: string; title: string; skills: string[]; rating: number; completedJobs: number; status: string; phone: string; openJobs: number }
export interface RequestDto { id: number; code: string; customerId: number; customerName: string; issueType: string; priority: string; status: string; description: string; createdAt: string; createdBy: string; imageCount: number; workOrderId: number; workOrderCode: string }
export interface SummaryDto { id: number; code: string; customerId: number; customerName: string; serviceType: string; priority: string; status: string; technicianId: number | null; technicianName: string | null; scheduledDate: string; startHour: number; durationHours: number; slaDueAt: string; slaBreached: boolean }
export interface DetailDto {
  summary: SummaryDto; description: string; notes: string | null; startedAt: string | null; completedAt: string | null
  customer: CustomerDto | null; technician: TechnicianDto | null
  timeline: { label: string; actor: string; at: string }[]
  checklist: { id: number; label: string; done: boolean }[]
  logs: { text: string; author: string; at: string }[]
  parts: { partId: number; code: string; name: string; quantity: number; unitPrice: number; amount: number }[]
  feedback: { stars: number; comment: string | null; createdAt: string } | null
  allowedTransitions: string[]
}
export interface PartDto { id: number; code: string; name: string; category: string; brand: string; stock: number; reorderLevel: number; unitPrice: number; state: string }
export interface InvoiceDto {
  id: number; number: string; workOrderId: number; workOrderCode: string; customer: CustomerDto; status: string; issuedOn: string; dueOn: string
  paymentMethod: string | null; transactionRef: string | null; lines: { description: string; quantity: number; unitPrice: number; amount: number }[]
  subtotal: number; gst: number; total: number
}
export interface DashboardDto { totalRequests: number; activeWorkOrders: number; pendingAppointments: number; overdue: number; statusCounts: Record<string, number> }
export interface ReportDto {
  totalRequests: number; completed: number; completionRatePercent: number; averageRating: number; revenue: number
  byStatus: Record<string, number>; byIssueType: Record<string, number>
  monthly: { month: string; created: number; resolved: number }[]; workload: { technician: string; openJobs: number; completedJobs: number }[]
}
export interface NotificationDto { type: string; workOrderId: number | null; code: string | null; status: string | null; message: string; at: string }

// ---- enum labels: HIGH -> High, EN_ROUTE -> En Route ----
export const label = (e: string) => e.toLowerCase().split('_').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ')
export const wire = (l: string) => l.toUpperCase().replace(/ /g, '_')

// The API stores no map coordinates, so the UI places people by area name on its schematic map.
const AREA_POS: Record<string, { x: number; y: number }> = {
  'T. Nagar': { x: 300, y: 300 }, Adyar: { x: 400, y: 385 }, Guindy: { x: 250, y: 380 }, Velachery: { x: 330, y: 445 },
  Egmore: { x: 385, y: 205 }, 'Anna Nagar': { x: 230, y: 170 }, Mylapore: { x: 445, y: 300 }, 'Besant Nagar': { x: 520, y: 425 },
}
const HOMES = [{ x: 190, y: 265 }, { x: 330, y: 140 }, { x: 500, y: 470 }, { x: 180, y: 430 }, { x: 150, y: 200 }]

export const toUser = (u: UserDto): User => ({ id: u.id, name: u.name, email: u.email, phone: u.phone ?? undefined, role: u.role as Role, customerId: u.customerId ?? undefined, technicianId: u.technicianId ?? undefined })

export const toCustomer = (c: CustomerDto): Customer => ({
  id: c.id, name: c.name, phone: c.phone, email: c.email, address: c.address, area: c.area ?? '', pos: AREA_POS[c.area ?? ''] ?? { x: 300 + (c.id % 5) * 30, y: 280 + (c.id % 4) * 30 },
})

export const toTechnician = (t: TechnicianDto): Technician => ({
  id: t.id, name: t.name, title: t.title, skills: t.skills, rating: Number(t.rating), jobs: t.completedJobs,
  status: label(t.status) as TechStatus, phone: t.phone, home: HOMES[(t.id - 1) % HOMES.length],
})

export const toRequest = (r: RequestDto): ServiceRequest => ({
  id: r.id, code: r.code, customerId: r.customerId, issueType: r.issueType, priority: label(r.priority) as Priority,
  status: label(r.status) as RequestStatus, description: r.description, createdOn: r.createdAt, createdBy: r.createdBy,
  images: r.imageCount, workOrderId: r.workOrderId,
})

export const toPart = (p: PartDto): Part => ({
  id: p.id, code: p.code, name: p.name, category: p.category, brand: p.brand, stock: p.stock, reorder: p.reorderLevel, price: Number(p.unitPrice),
})

export function toWorkOrder(d: DetailDto, requestId = 0): WorkOrder {
  const s = d.summary
  return {
    id: s.id, code: s.code, requestId, customerId: s.customerId, serviceType: s.serviceType, priority: label(s.priority) as Priority,
    status: label(s.status) as WOStatus, technicianId: s.technicianId, date: s.scheduledDate, startHour: s.startHour, duration: s.durationHours,
    description: d.description, notes: d.notes ?? undefined,
    timeline: d.timeline.map((t) => ({ label: t.label, at: t.at, by: t.actor })),
    parts: d.parts.map((p) => ({ partId: p.partId, qty: p.quantity })),
    log: d.logs.map((l) => ({ text: l.text, at: l.at, by: l.author })),
    checklist: d.checklist.map((c) => ({ id: c.id, label: c.label, done: c.done })),
    rating: d.feedback ? { stars: d.feedback.stars, comment: d.feedback.comment ?? '', at: d.feedback.createdAt } : undefined,
    slaDueAt: s.slaDueAt, slaBreached: s.slaBreached,
  }
}

export const toInvoice = (i: InvoiceDto): Invoice => ({
  id: i.id, number: i.number, woId: i.workOrderId, customerId: i.customer.id, status: label(i.status) as Invoice['status'],
  issued: i.issuedOn, due: i.dueOn, lines: i.lines.map((l) => ({ desc: l.description, qty: l.quantity, unit: Number(l.unitPrice) })),
  method: i.paymentMethod ?? undefined, txn: i.transactionRef ?? undefined,
})
