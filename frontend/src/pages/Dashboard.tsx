import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertTriangle, CalendarClock, ClipboardCheck, Inbox, Plus, Sparkles, Wrench } from 'lucide-react'
import { Area, AreaChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useAuth } from '../auth/AuthContext'
import { useStore } from '../api/store'
import { fmtDate, isoDate } from '../api/format'
import { Badge, Card, PageHeader, StatCard } from '../components/ui'
import { useScoped } from './scope'
import { aiMessage, aiRun } from '../api/ai'
import AiText from '../components/AiText'

const trend = [
  { m: 'Mar', Created: 310, Resolved: 270 }, { m: 'Apr', Created: 380, Resolved: 345 }, { m: 'May', Created: 350, Resolved: 330 },
  { m: 'Jun', Created: 460, Resolved: 410 }, { m: 'Jul', Created: 430, Resolved: 440 }, { m: 'Aug', Created: 520, Resolved: 470 },
]

export const STATUS_COLORS: Record<string, string> = {
  Completed: '#2f7d4f', Scheduled: '#6c72d9', 'In Progress': '#e8a317', Pending: '#d9702a', Cancelled: '#c4294f',
}

export default function Dashboard() {
  const { user } = useAuth()
  const { customers } = useStore()
  const { requests, workOrders } = useScoped()
  const nav = useNavigate()
  const [sum, setSum] = useState('')
  const [sumBusy, setSumBusy] = useState(false)
  const summarise = async () => {
    setSumBusy(true); setSum('')
    try {
      setSum(await aiRun('REPORT_SUMMARY', {
        totalRequests: requests.length, totalWorkOrders: workOrders.length, active: stats.active, pendingAppointments: stats.pendingAppts, overdue: stats.overdue,
        slaBreached: workOrders.filter((w) => w.slaBreached).length, statusCounts: Object.fromEntries(stats.pie.map((p) => [p.name, p.value])),
        highPriorityOpen: workOrders.filter((w) => w.priority === 'High' && !['Completed', 'Cancelled'].includes(w.status)).length,
      }))
    } catch (ex) { setSum(aiMessage(ex)) } finally { setSumBusy(false) }
  }
  const hour = new Date().getHours()
  const greet = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening'
  const first = user!.name.split(' ')[0]

  const stats = useMemo(() => {
    const today = isoDate(0)
    const active = workOrders.filter((w) => ['Assigned', 'En Route', 'In Progress'].includes(w.status)).length
    const pendingAppts = workOrders.filter((w) => w.status === 'Assigned' && w.date >= today).length
    const overdue = workOrders.filter((w) => w.date < today && !['Completed', 'Cancelled'].includes(w.status)).length
    const pie = [
      { name: 'Completed', value: workOrders.filter((w) => w.status === 'Completed').length },
      { name: 'Scheduled', value: workOrders.filter((w) => w.status === 'Assigned').length },
      { name: 'In Progress', value: workOrders.filter((w) => w.status === 'En Route' || w.status === 'In Progress').length },
      { name: 'Pending', value: workOrders.filter((w) => w.status === 'Created').length },
      { name: 'Cancelled', value: workOrders.filter((w) => w.status === 'Cancelled').length },
    ]
    return { active, pendingAppts, overdue, pie }
  }, [workOrders])

  const recent = [...requests].sort((a, b) => b.createdOn.localeCompare(a.createdOn)).slice(0, 5)
  const total = workOrders.length

  return (
    <>
      <PageHeader title={`${greet}, ${first}!`} sub="Here's what's happening today.">
        {user!.role !== 'TECHNICIAN' && (
          <button className="btn p" onClick={() => nav('/requests/new')}><Plus size={17} /> New Request</button>
        )}
      </PageHeader>

      <div className="stats">
        <StatCard icon={<Inbox size={22} />} tone="green" value={requests.length} label="Total Requests" delta={{ text: '12%', up: true }} />
        <StatCard icon={<Wrench size={22} />} tone="blue" value={stats.active} label="Active Work Orders" delta={{ text: '8%', up: true }} />
        <StatCard icon={<CalendarClock size={22} />} tone="amber" value={stats.pendingAppts} label="Pending Appointments" delta={{ text: '5%', up: false }} />
        <StatCard icon={<AlertTriangle size={22} />} tone="red" value={stats.overdue} label="Overdue" delta={{ text: '4%', up: false }} />
      </div>

      <div className="g-2-1" style={{ marginBottom: 16 }}>
        <Card title="Service Requests Trend">
          <div style={{ height: 270 }}>
            <ResponsiveContainer>
              <AreaChart data={trend} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                <defs>
                  <linearGradient id="gC" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2e3192" stopOpacity={0.28} /><stop offset="100%" stopColor="#2e3192" stopOpacity={0.02} /></linearGradient>
                  <linearGradient id="gR" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2f7d4f" stopOpacity={0.28} /><stop offset="100%" stopColor="#2f7d4f" stopOpacity={0.02} /></linearGradient>
                </defs>
                <CartesianGrid stroke="#e2e3ee" vertical={false} />
                <XAxis dataKey="m" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} />
                <Tooltip />
                <Legend verticalAlign="top" align="right" iconType="plainline" height={30} />
                <Area type="monotone" dataKey="Created" stroke="#2e3192" strokeWidth={2.4} fill="url(#gC)" isAnimationActive={false} />
                <Area type="monotone" dataKey="Resolved" stroke="#2f7d4f" strokeWidth={2.4} fill="url(#gR)" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Work Order Status">
          <div className="donut-wrap">
            <div className="donut">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={stats.pie.filter((p) => p.value > 0)} dataKey="value" innerRadius={58} outerRadius={84} paddingAngle={2} stroke="none" isAnimationActive={false}>
                    {stats.pie.filter((p) => p.value > 0).map((p) => <Cell key={p.name} fill={STATUS_COLORS[p.name]} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="donut-c"><small>Total</small><b>{total}</b></div>
            </div>
            <ul className="legend">
              {stats.pie.map((p) => (
                <li key={p.name}><i style={{ background: STATUS_COLORS[p.name] }} />{p.name}<b>{p.value}</b></li>
              ))}
            </ul>
          </div>
        </Card>
      </div>

      {(user!.role === 'ADMIN' || user!.role === 'MANAGER') && (
        <Card title="AI summary">
          <button type="button" className="btn sm ai-btn" onClick={summarise} disabled={sumBusy}><Sparkles size={14} /> {sumBusy ? 'Thinking…' : 'Summarise the current figures'}</button>
          {sum && <div className="ai-note"><AiText text={sum} /></div>}
        </Card>
      )}

      <Card title="Recent Service Requests" action={<Link to="/requests">View All</Link>}>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead><tr><th>ID</th><th>Customer</th><th>Issue Type</th><th>Priority</th><th>Status</th><th>Created On</th></tr></thead>
            <tbody>
              {recent.map((r) => (
                <tr key={r.id} className="click" onClick={() => nav(`/work-orders/${r.workOrderId}`)}>
                  <td><b className="id">{r.code}</b></td>
                  <td>{customers.find((c) => c.id === r.customerId)?.name}</td>
                  <td>{r.issueType}</td>
                  <td><Badge>{r.priority}</Badge></td>
                  <td><Badge>{r.status}</Badge></td>
                  <td>{fmtDate(r.createdOn)}</td>
                </tr>
              ))}
              {!recent.length && <tr><td colSpan={6} className="empty">No requests yet</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
      {user!.role === 'CUSTOMER' && <p className="muted" style={{ marginTop: 12 }}><ClipboardCheck size={14} style={{ verticalAlign: -2 }} /> Showing your own requests and work orders only.</p>}
    </>
  )
}
