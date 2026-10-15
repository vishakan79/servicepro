import { useCallback, useEffect, useMemo, useRef, useState, ReactNode } from 'react'
import { Client } from '@stomp/stompjs'
import { useAuth } from '../auth/AuthContext'
import { Customer, Invoice, Part, ServiceRequest, Technician, WOStatus, WorkOrder } from '../types'
import { SKILLS } from './format'
import { API_BASE, WS_URL } from './config'
import { api, ApiError, fetchAll, getToken } from './http'
import {
  CustomerDto, DetailDto, InvoiceDto, NotificationDto, PartDto, RequestDto, SummaryDto, TechnicianDto, wire,
  toCustomer, toInvoice, toPart, toRequest, toTechnician, toWorkOrder,
} from './mappers'
import { Activity, Ctx, Store, Toast } from './store'

let nid = 1000
const msg = (e: unknown) => (e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Something went wrong')

/**
 * Real implementation of the Store contract: every action is a REST call, then the affected lists are re-read
 * so the UI always shows server truth (state machine, SLA, stock, invoice totals are all decided server-side).
 * Live updates arrive over STOMP (/topic/work-orders for staff, /user/queue/notifications for everyone).
 */
export function ApiStoreProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [technicians, setTechs] = useState<Technician[]>([])
  const [requests, setRequests] = useState<ServiceRequest[]>([])
  const [workOrders, setWO] = useState<WorkOrder[]>([])
  const [parts, setParts] = useState<Part[]>([])
  const [invoices, setInv] = useState<Invoice[]>([])
  const [toasts, setToasts] = useState<Toast[]>([])
  const [activity, setActivity] = useState<Activity[]>([])
  const [unread, setUnread] = useState(0)
  const role = user?.role

  const toast = useCallback((text: string, tone: Toast['tone'] = 'info') => {
    const id = ++nid
    setToasts((t) => [...t.slice(-2), { id, text, tone }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500)
  }, [])
  const dismiss = (id: number) => setToasts((t) => t.filter((x) => x.id !== id))
  const note = useCallback((text: string, at?: string) => {
    setActivity((a) => [{ id: ++nid, text, at: at ?? new Date().toISOString() }, ...a].slice(0, 12))
    setUnread((u) => u + 1)
  }, [])

  // ---- loading -------------------------------------------------------------------------------
  const loadWorkOrders = useCallback(async () => {
    const [summaries, reqs] = await Promise.all([
      fetchAll<SummaryDto>('/work-orders'),
      role === 'TECHNICIAN' ? Promise.resolve([] as RequestDto[]) : fetchAll<RequestDto>('/requests'),
    ])
    const details = await Promise.all(summaries.map((s) => api<DetailDto>(`/work-orders/${s.id}`)))
    const reqByWo = new Map(reqs.map((r) => [r.workOrderId, r.id]))
    setRequests(reqs.map(toRequest))
    setWO(details.map((d) => toWorkOrder(d, reqByWo.get(d.summary.id) ?? 0)))
    // Customers/technicians the user may not list directly are still visible through their work orders.
    setCustomers((old) => merge(old, details.flatMap((d) => (d.customer ? [toCustomer(d.customer)] : []))))
    setTechs((old) => merge(old, details.flatMap((d) => (d.technician ? [toTechnician(d.technician)] : []))))
  }, [role])

  const loadInvoices = useCallback(async () => {
    if (role === 'TECHNICIAN') return setInv([])
    const list = await fetchAll<{ id: number }>('/invoices')
    const full = await Promise.all(list.map((i) => api<InvoiceDto>(`/invoices/${i.id}`)))
    setInv(full.map(toInvoice))
    setCustomers((old) => merge(old, full.map((i) => toCustomer(i.customer))))
  }, [role])

  const loadParts = useCallback(async () => {
    if (role === 'CUSTOMER') return setParts([])
    setParts((await fetchAll<PartDto>('/parts')).map(toPart))
  }, [role])

  const loadPeople = useCallback(async () => {
    if (role !== 'ADMIN' && role !== 'MANAGER') return
    const [c, t] = await Promise.all([api<CustomerDto[]>('/customers'), api<TechnicianDto[]>('/technicians')])
    setCustomers((old) => merge(old, c.map(toCustomer)))
    setTechs((old) => merge(old, t.map(toTechnician)))
  }, [role])

  const reload = useCallback(async () => {
    try { await Promise.all([loadWorkOrders(), loadInvoices(), loadParts(), loadPeople()]) }
    catch (e) { toast(`Could not load data: ${msg(e)}`, 'warn') }
  }, [loadWorkOrders, loadInvoices, loadParts, loadPeople, toast])

  useEffect(() => {
    if (!user) { setCustomers([]); setTechs([]); setRequests([]); setWO([]); setParts([]); setInv([]); setActivity([]); setUnread(0); return }
    void reload()
  }, [user, reload])

  // ---- live updates --------------------------------------------------------------------------
  const reloadRef = useRef(reload)
  reloadRef.current = reload
  useEffect(() => {
    if (!user) return
    const brokerURL = WS_URL || (API_BASE || window.location.origin).replace(/^http/, 'ws') + '/ws'
    const client = new Client({
      brokerURL,
      connectHeaders: { Authorization: `Bearer ${getToken() ?? ''}` },
      // a reconnect after token expiry must send a fresh token
      beforeConnect: () => { client.connectHeaders = { Authorization: `Bearer ${getToken() ?? ''}` } },
      reconnectDelay: 5000,
    })
    let timer: ReturnType<typeof setTimeout> | undefined
    const onEvent = (m: { body: string }) => {
      const ev = JSON.parse(m.body) as NotificationDto
      note(ev.message, ev.at)
      toast(ev.message, ev.type === 'WORK_ORDER' ? 'info' : 'warn')
      clearTimeout(timer)
      timer = setTimeout(() => void reloadRef.current(), 400) // coalesce bursts
    }
    client.onConnect = () => {
      client.subscribe('/user/queue/notifications', onEvent)
      if (user.role === 'ADMIN' || user.role === 'MANAGER') client.subscribe('/topic/work-orders', onEvent)
    }
    client.activate()
    return () => { clearTimeout(timer); void client.deactivate() }
  }, [user, note, toast])

  // ---- actions -------------------------------------------------------------------------------
  const run = async <T,>(fn: () => Promise<T>, fallback: T): Promise<T> => {
    try { return await fn() } catch (e) { toast(msg(e), 'warn'); return fallback }
  }

  const addCustomer: Store['addCustomer'] = async (c) => {
    const created = await api<CustomerDto>('/customers', { method: 'POST', body: { ...c, area: null } })
    setCustomers((l) => merge(l, [toCustomer(created)]))
    return created.id
  }

  const createRequest: Store['createRequest'] = async (i) => {
    const r = await api<RequestDto>('/requests', {
      method: 'POST',
      body: { customerId: i.customerId, issueType: i.issueType, priority: wire(i.priority), description: i.description, imageCount: i.images },
    })
    toast(`Service request ${r.code} created`, 'ok')
    await reload()
    return r.workOrderId
  }

  const assign: Store['assign'] = async (woId, techId, date, hour, duration, notes) => {
    try {
      await api(`/work-orders/${woId}/assign`, { method: 'POST', body: { technicianId: techId, date, startHour: hour, durationHours: duration, notes } })
      await reload()
      toast('Technician assigned', 'ok')
      return null
    } catch (e) { return msg(e) } // 409 = technician double-booked; the page shows it inline
  }

  // The server's auto-assign applies immediately; the UI only needs a suggestion, so rank client-side
  // with the same inputs (skill match, rating, that day's workload) and let the user confirm.
  const autoPick: Store['autoPick'] = (woId) => {
    const w = workOrders.find((x) => x.id === woId)
    if (!w) return null
    const need = SKILLS[w.serviceType] ?? []
    const load = (id: number) => workOrders.filter((x) => x.technicianId === id && x.date === w.date && x.status !== 'Cancelled').length
    return technicians
      .filter((t) => t.status !== 'On Leave')
      .map((t) => ({ t, score: (t.skills.some((s) => need.includes(s)) ? 10 : 0) + t.rating - load(t.id) * 2 }))
      .sort((a, b) => b.score - a.score)[0]?.t.id ?? null
  }

  const setStatus: Store['setStatus'] = async (woId, s: WOStatus) => {
    await run(async () => {
      await api(`/work-orders/${woId}/status`, { method: 'POST', body: { status: wire(s) } })
      await reload()
      toast(`Work order is now ${s}`, 'ok')
    }, undefined)
  }

  const toggleCheck: Store['toggleCheck'] = async (woId, idx) => {
    const item = workOrders.find((w) => w.id === woId)?.checklist[idx]
    if (!item?.id) return
    const done = !item.done
    setWO((l) => l.map((w) => (w.id === woId ? { ...w, checklist: w.checklist.map((c, i) => (i === idx ? { ...c, done } : c)) } : w))) // optimistic
    try { await api(`/work-orders/${woId}/checklist/${item.id}`, { method: 'PUT', body: { done } }) }
    catch (e) { toast(msg(e), 'warn'); await reload() }
  }

  const addLog: Store['addLog'] = async (woId, text) => {
    await run(async () => { await api(`/work-orders/${woId}/logs`, { method: 'POST', body: { text } }); await loadWorkOrders() }, undefined)
  }

  const addPart: Store['addPart'] = async (woId, partId, qty) => {
    if (!partId) return 'Select a part'
    try {
      await api(`/work-orders/${woId}/parts`, { method: 'POST', body: { partId, quantity: qty } })
      await Promise.all([loadWorkOrders(), loadParts()])
      return null
    } catch (e) { return msg(e) } // e.g. 409 insufficient stock
  }

  const restock: Store['restock'] = async (partId, qty) => {
    await run(async () => {
      await api(`/parts/${partId}/restock`, { method: 'POST', body: { quantity: qty } })
      await loadParts()
      toast(`Added ${qty} units to stock`, 'ok')
    }, undefined)
  }

  const markPaid: Store['markPaid'] = async (invId, method) => {
    await run(async () => {
      await api(`/invoices/${invId}/pay`, { method: 'POST', body: { method } })
      await loadInvoices()
      toast('Payment recorded', 'ok')
    }, undefined)
  }

  const rate: Store['rate'] = async (woId, stars, comment) => {
    await run(async () => {
      await api(`/work-orders/${woId}/feedback`, { method: 'POST', body: { stars, comment } })
      await loadWorkOrders()
      toast('Thanks for your feedback', 'ok')
    }, undefined)
  }

  // The server derives technician status from live work orders; no client-side guessing in API mode.
  const techStatusOf = useCallback((t: Technician) => t.status, [])

  const value = useMemo<Store>(
    () => ({
      customers, technicians, requests, workOrders, parts, invoices, toasts, activity, unread,
      markRead: () => setUnread(0), toast, dismiss, addCustomer, createRequest, assign, autoPick, setStatus, toggleCheck, addLog,
      addPart, restock, markPaid, rate, techStatusOf,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [customers, technicians, requests, workOrders, parts, invoices, toasts, activity, unread, techStatusOf, reload],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

function merge<T extends { id: number }>(old: T[], incoming: T[]): T[] {
  const m = new Map(old.map((x) => [x.id, x]))
  incoming.forEach((x) => m.set(x.id, x))
  return [...m.values()].sort((a, b) => a.id - b.id)
}
