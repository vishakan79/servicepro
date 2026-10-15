import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { useStore } from '../api/store'
import { fmtDate } from '../api/format'
import { Badge, Card, Empty, PageHeader } from '../components/ui'
import { useScoped } from './scope'

export default function Requests() {
  const { customers } = useStore()
  const { requests } = useScoped()
  const nav = useNavigate()
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const [status, setStatus] = useState('All')
  const [pri, setPri] = useState('All')

  const rows = useMemo(() => {
    const t = q.toLowerCase()
    return [...requests]
      .filter((r) => status === 'All' || r.status === status)
      .filter((r) => pri === 'All' || r.priority === pri)
      .filter((r) => {
        if (!t) return true
        const c = customers.find((x) => x.id === r.customerId)
        return [r.code, r.issueType, c?.name, c?.area].some((v) => v?.toLowerCase().includes(t))
      })
      .sort((a, b) => b.createdOn.localeCompare(a.createdOn))
  }, [requests, customers, q, status, pri])

  return (
    <>
      <PageHeader title="Service Requests" sub="Track and manage every incoming service request.">
        <button className="btn p" onClick={() => nav('/requests/new')}><Plus size={17} /> New Request</button>
      </PageHeader>
      <div className="toolbar">
        <div className="search"><Search size={16} /><input value={q} onChange={(e) => setParams(e.target.value ? { q: e.target.value } : {})} placeholder="Search by ID, customer, issue..." aria-label="Filter requests" /></div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
          {['All', 'New', 'Scheduled', 'In Progress', 'Completed', 'Cancelled'].map((s) => <option key={s}>{s}</option>)}
        </select>
        <select value={pri} onChange={(e) => setPri(e.target.value)} aria-label="Priority">
          {['All', 'High', 'Medium', 'Low'].map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>
      <Card>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead><tr><th>ID</th><th>Customer</th><th>Issue Type</th><th>Area</th><th>Priority</th><th>Status</th><th>Created On</th></tr></thead>
            <tbody>
              {rows.map((r) => {
                const c = customers.find((x) => x.id === r.customerId)
                return (
                  <tr key={r.id} className="click" onClick={() => nav(`/work-orders/${r.workOrderId}`)}>
                    <td><b className="id">{r.code}</b></td>
                    <td>{c?.name}</td>
                    <td>{r.issueType}</td>
                    <td>{c?.area}</td>
                    <td><Badge>{r.priority}</Badge></td>
                    <td><Badge>{r.status}</Badge></td>
                    <td>{fmtDate(r.createdOn)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {!rows.length && <Empty text="No service requests match your filters." />}
        </div>
      </Card>
    </>
  )
}
