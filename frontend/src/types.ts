export type Role = 'ADMIN' | 'MANAGER' | 'TECHNICIAN' | 'CUSTOMER' | 'INVENTORY_MANAGER'

export interface User {
  id: number
  name: string
  email: string
  phone?: string
  role: Role
  customerId?: number
  technicianId?: number
}

export interface Pt { x: number; y: number }

export interface Customer {
  id: number
  name: string
  phone: string
  email: string
  address: string
  area: string
  pos: Pt
}

export type TechStatus = 'Available' | 'On Duty' | 'On Leave'

export interface Technician {
  id: number
  name: string
  title: string
  skills: string[]
  rating: number
  jobs: number
  status: TechStatus
  phone: string
  home: Pt
}

export type Priority = 'High' | 'Medium' | 'Low'
export type RequestStatus = 'New' | 'Scheduled' | 'In Progress' | 'Completed' | 'Cancelled'

export interface ServiceRequest {
  id: number
  code: string
  customerId: number
  issueType: string
  priority: Priority
  status: RequestStatus
  description: string
  createdOn: string
  createdBy: string
  images: number
  workOrderId: number
}

export type WOStatus = 'Created' | 'Assigned' | 'En Route' | 'In Progress' | 'Completed' | 'Cancelled'

export interface WorkOrder {
  id: number
  code: string
  requestId: number
  customerId: number
  serviceType: string
  priority: Priority
  status: WOStatus
  technicianId: number | null
  date: string // YYYY-MM-DD (preferred date until assigned)
  startHour: number
  duration: number
  description: string
  timeline: { label: string; at: string; by: string }[]
  parts: { partId: number; qty: number }[]
  log: { text: string; at: string; by: string }[]
  checklist: { id?: number; label: string; done: boolean }[]
  notes?: string
  rating?: { stars: number; comment: string; at: string }
  slaDueAt?: string
  slaBreached?: boolean
}

export interface Part {
  id: number
  code: string
  name: string
  category: string
  brand: string
  stock: number
  reorder: number
  price: number
}

export interface InvoiceLine { desc: string; qty: number; unit: number }

export interface Invoice {
  id: number
  number: string
  woId: number
  customerId: number
  status: 'Paid' | 'Pending' | 'Overdue'
  issued: string
  due: string
  lines: InvoiceLine[]
  method?: string
  txn?: string
}
