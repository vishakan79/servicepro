import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { useStore } from '../api/store'
import { fmtDate, fmtHour } from '../api/format'
import { Avatar, Badge, Card, Empty, PageHeader } from '../components/ui'
import { useScoped } from './scope'

export default function WorkOrders() {
  const { customers, technicians } = useStore()
  const { workOrders } = useScoped()
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('All')

  const rows = useMemo(() => {
    const t = q.toLowerCase()
    return [...workOrders]
      .filter((w) => status === 'All' || w.status === status)
      .filter((w) => !t || [w.code, w.serviceType, customers.find((c) => c.id === w.customerId)?.name].some((v) => v?.toLowerCase().includes(t)))
      .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id)
  }, [workOrders, q, status, customers])

  return (
    <>
      <PageHeader title="Work Orders" sub="Assign technicians, track progress and close out jobs." />
      <div className="toolbar">
        <div className="search"><Search size={16} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search work orders..." aria-label="Search work orders" /></div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
          {['All', 'Created', 'Assigned', 'En Route', 'In Progress', 'Completed', 'Cancelled'].map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>
      <Card>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead><tr><th>Work Order</th><th>Customer</th><th>Service</th><th>Technician</th><th>Scheduled</th><th>Priority</th><th>Status</th></tr></thead>
            <tbody>
              {rows.map((w) => {
                const c = customers.find((x) => x.id === w.customerId)
                const t = technicians.find((x) => x.id === w.technicianId)
                return (
                  <tr key={w.id} className="click" onClick={() => nav(`/work-orders/${w.id}`)}>
                    <td><b className="id">{w.code}</b></td>
                    <td>{c?.name}</td>
                    <td>{w.serviceType}</td>
                    <td>{t ? <span className="who-c"><Avatar name={t.name} size={26} />{t.name}</span> : <span className="muted">Unassigned</span>}</td>
                    <td>{t ? <>{fmtDate(w.date)}<small className="muted"> {fmtHour(w.startHour)}</small></> : <span className="muted">Preferred {fmtDate(w.date)}</span>}</td>
                    <td><Badge>{w.priority}</Badge></td>
                    <td><Badge>{w.status}</Badge></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {!rows.length && <Empty text="No work orders found." />}
        </div>
      </Card>
    </>
  )
}
