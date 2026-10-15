import { useMemo } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ClipboardCheck, Inbox, Percent, Star } from 'lucide-react'
import { useStore } from '../api/store'
import { Card, PageHeader, StatCard } from '../components/ui'
import { totalOf } from './Invoices'

const COLORS = ['#2e3192', '#2f7d4f', '#e8a317', '#6a4c93', '#8b8dad', '#c4294f', '#6c72d9']
const monthly = [{ m: 'Jan', v: 45 }, { m: 'Feb', v: 62 }, { m: 'Mar', v: 78 }, { m: 'Apr', v: 96 }, { m: 'May', v: 110 }, { m: 'Jun', v: 128 }]

export default function Reports() {
  const { requests, workOrders, technicians, invoices } = useStore()
  const d = useMemo(() => {
    const byType = Object.entries(requests.reduce<Record<string, number>>((a, r) => ({ ...a, [r.issueType]: (a[r.issueType] ?? 0) + 1 }), {})).map(([name, value]) => ({ name, value }))
    const done = workOrders.filter((w) => w.status === 'Completed')
    const rated = workOrders.filter((w) => w.rating)
    const avg = rated.length ? rated.reduce((a, w) => a + w.rating!.stars, 0) / rated.length : 0
    const revenue = invoices.filter((i) => i.status === 'Paid').reduce((a, i) => a + totalOf(i).total, 0)
    const perTech = technicians.map((t) => ({ name: t.name, jobs: workOrders.filter((w) => w.technicianId === t.id).length }))
    return { byType, done: done.length, rate: Math.round((done.length / Math.max(workOrders.length, 1)) * 100), avg, revenue, perTech }
  }, [requests, workOrders, technicians, invoices])
  const max = Math.max(...d.perTech.map((p) => p.jobs), 1)

  return (
    <>
      <PageHeader title="Service Reports" sub="Analytics and performance metrics." />
      <div className="stats">
        <StatCard icon={<Inbox size={22} />} tone="blue" value={requests.length} label="Total Requests" delta={{ text: '12%', up: true }} />
        <StatCard icon={<ClipboardCheck size={22} />} tone="green" value={d.done} label="Completed" delta={{ text: '8%', up: true }} />
        <StatCard icon={<Percent size={22} />} tone="purple" value={`${d.rate}%`} label="Completion Rate" delta={{ text: '5%', up: true }} />
        <StatCard icon={<Star size={22} />} tone="amber" value={d.avg.toFixed(1)} label="Avg. Rating" delta={{ text: '0.2', up: true }} />
      </div>
      <div className="grid-2">
        <Card title="Requests by Issue Type">
          <div className="donut-wrap">
            <div className="donut">
              <ResponsiveContainer><PieChart><Pie data={d.byType} dataKey="value" innerRadius={58} outerRadius={84} paddingAngle={2} stroke="none" isAnimationActive={false}>{d.byType.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie></PieChart></ResponsiveContainer>
              <div className="donut-c"><small>Total</small><b>{requests.length}</b></div>
            </div>
            <ul className="legend">{d.byType.map((p, i) => <li key={p.name}><i style={{ background: COLORS[i % COLORS.length] }} />{p.name}<b>{p.value}</b></li>)}</ul>
          </div>
        </Card>
        <Card title="Monthly Work Orders">
          <div style={{ height: 230 }}>
            <ResponsiveContainer>
              <BarChart data={monthly} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid stroke="#e2e3ee" vertical={false} /><XAxis dataKey="m" tickLine={false} axisLine={false} fontSize={12} /><YAxis tickLine={false} axisLine={false} fontSize={12} /><Tooltip cursor={{ fill: '#f3f3f8' }} />
                <Bar dataKey="v" name="Work orders" fill="#2e3192" radius={[5, 5, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
      <Card title="Technician Workload" className="mt">
        {d.perTech.map((p) => (
          <div key={p.name} className="bar-row"><span>{p.name}</span><div className="bar"><i style={{ width: `${(p.jobs / max) * 100}%`, background: '#2e3192' }} /></div><b>{p.jobs} jobs</b></div>
        ))}
      </Card>
    </>
  )
}
