import { useMemo } from 'react'
import { useAuth } from '../auth/AuthContext'
import { useStore } from '../api/store'

/** Role-scoped data. This is UX only: the Spring Boot API must enforce the same rules server-side. */
export function useScoped() {
  const { user } = useAuth()
  const s = useStore()
  return useMemo(() => {
    const u = user!
    const workOrders = s.workOrders.filter((w) =>
      u.role === 'TECHNICIAN' ? w.technicianId === u.technicianId : u.role === 'CUSTOMER' ? w.customerId === u.customerId : true,
    )
    const ids = new Set(workOrders.map((w) => w.id))
    const requests = s.requests.filter((r) => (u.role === 'CUSTOMER' ? r.customerId === u.customerId : u.role === 'TECHNICIAN' ? ids.has(r.workOrderId) : true))
    const invoices = s.invoices.filter((i) => (u.role === 'CUSTOMER' ? i.customerId === u.customerId : true))
    return { workOrders, requests, invoices }
  }, [s.workOrders, s.requests, s.invoices, user])
}
