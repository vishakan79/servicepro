import { createContext, useContext } from 'react'
import { Customer, Invoice, Part, Priority, ServiceRequest, Technician, WOStatus, WorkOrder } from '../types'

export interface Toast { id: number; text: string; tone: 'info' | 'ok' | 'warn' }
export interface Activity { id: number; text: string; at: string }

export interface NewRequestInput {
  customerId: number
  issueType: string
  priority: Priority
  description: string
  images: number
  by: string
}

export interface Store {
  customers: Customer[]
  technicians: Technician[]
  requests: ServiceRequest[]
  workOrders: WorkOrder[]
  parts: Part[]
  invoices: Invoice[]
  toasts: Toast[]
  activity: Activity[]
  unread: number
  markRead: () => void
  toast: (text: string, tone?: Toast['tone']) => void
  dismiss: (id: number) => void
  addCustomer: (c: Omit<Customer, 'id' | 'pos' | 'area'>) => Promise<number>
  createRequest: (i: NewRequestInput) => Promise<number>
  assign: (woId: number, techId: number, date: string, hour: number, duration: number, notes: string, by: string) => Promise<string | null>
  autoPick: (woId: number) => number | null
  setStatus: (woId: number, s: WOStatus, by: string) => Promise<void>
  punch: (woId: number, kind: 'check-in' | 'check-out', loc: { lat: number; lng: number } | null) => Promise<void>
  toggleCheck: (woId: number, idx: number) => Promise<void>
  addLog: (woId: number, text: string, by: string) => Promise<void>
  addPart: (woId: number, partId: number, qty: number) => Promise<string | null>
  restock: (partId: number, qty: number) => Promise<void>
  saveItem: (item: { code: string; name: string; category: string; brand: string; stock: number; reorder: number; price: number }, id?: number) => Promise<string | null>
  markPaid: (invId: number, method: string) => Promise<void>
  rate: (woId: number, stars: number, comment: string) => Promise<void>
  techStatusOf: (t: Technician) => Technician['status']
}

export const Ctx = createContext<Store | null>(null)

export function useStore() {
  const c = useContext(Ctx)
  if (!c) throw new Error('ApiStoreProvider missing')
  return c
}
