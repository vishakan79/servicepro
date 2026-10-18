import { useMemo, useState } from 'react'
import { MapPin, MessageSquare, Phone } from 'lucide-react'
import { useStore } from '../api/store'
import { Avatar, Badge, Card, Empty, PageHeader } from '../components/ui'

const AREAS: [string, number, number][] = [
  ['North zone', 230, 150], ['East zone', 385, 185], ['Central zone', 290, 285], ['City centre', 445, 280], ['West zone', 225, 365], ['South-east zone', 400, 365], ['South zone', 310, 450], ['Coastal zone', 505, 405],
]

export function ServiceMap({ children }: { children?: React.ReactNode }) {
  return (
    <div className="map">
      <svg viewBox="0 0 680 540" role="img" aria-label="Service area map with technician positions">
        <rect width="680" height="540" fill="#e6ece6" />
        <path d="M575 0 L680 0 L680 540 L560 540 Q590 430 570 330 Q550 220 575 0Z" fill="#b9d3da" />
        <path d="M0 330 Q120 300 230 340 Q330 370 440 335 Q520 312 575 330" stroke="#b9d3da" strokeWidth="14" fill="none" />
        <g stroke="#fff" strokeWidth="9" fill="none" strokeLinecap="round">
          <path d="M60 80 L560 120" /><path d="M40 200 L570 240" /><path d="M30 420 L560 470" /><path d="M150 20 L120 520" /><path d="M300 10 L330 530" /><path d="M450 20 L470 520" />
        </g>
        <g stroke="#f9d98a" strokeWidth="5" fill="none" strokeLinecap="round"><path d="M0 290 L560 300" /><path d="M210 0 L250 540" /></g>
        <g fill="#d7e6cd"><rect x="80" y="120" width="60" height="55" rx="8" /><rect x="340" y="395" width="70" height="40" rx="8" /><rect x="480" y="150" width="60" height="50" rx="8" /></g>
        {AREAS.map(([n, x, y]) => <text key={n} x={x} y={y} fontSize="11" fill="#8b8dad" textAnchor="middle">{n}</text>)}
        {children}
      </svg>
    </div>
  )
}

export default function Tracking() {
  const { technicians, workOrders, customers, techStatusOf, toast } = useStore()
  const [filter, setFilter] = useState('All Technicians')

  const live = useMemo(
    () =>
      technicians.map((t) => {
        const job = workOrders.find((w) => w.technicianId === t.id && (w.status === 'En Route' || w.status === 'In Progress'))
        const c = job ? customers.find((x) => x.id === job.customerId) : undefined
        const pos = job && c ? (job.status === 'En Route' ? { x: t.home.x + (c.pos.x - t.home.x) * 0.55, y: t.home.y + (c.pos.y - t.home.y) * 0.55 } : c.pos) : t.home
        return { t, job, c, pos, state: techStatusOf(t) }
      }),
    [technicians, workOrders, customers, techStatusOf],
  )
  const shown = live.filter((l) => filter === 'All Technicians' || (filter === 'On the way' ? l.job?.status === 'En Route' : filter === 'On site' ? l.job?.status === 'In Progress' : !l.job && l.state !== 'On Leave'))

  return (
    <>
      <PageHeader title="Live Technician Tracking" sub="Track real-time location of technicians and active jobs." />
      <div className="toolbar">
        <select value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter technicians">
          {['All Technicians', 'On the way', 'On site', 'Idle'].map((o) => <option key={o}>{o}</option>)}
        </select>
        <span className="badge green">● Live</span>
      </div>
      <div className="trk">
        <ServiceMap>
          {live.filter((l) => l.job && l.c).map(({ t, c, pos, job }) => (
            <g key={t.id}>
              <path d={`M${pos.x} ${pos.y} L${c!.pos.x} ${c!.pos.y}`} stroke="#2e3192" strokeWidth="3" strokeDasharray="7 6" fill="none" />
              <g transform={`translate(${c!.pos.x} ${c!.pos.y})`}><circle r="9" fill="#2f7d4f" stroke="#fff" strokeWidth="3" /></g>
              <g transform={`translate(${pos.x} ${pos.y})`}>
                {job!.status === 'En Route' && <circle r="14" fill="#2e3192" className="pulse" />}
                <circle r="11" fill="#2e3192" stroke="#fff" strokeWidth="3" />
                <text y="4" textAnchor="middle" fontSize="10" fontWeight="700" fill="#fff">{t.name[0]}</text>
              </g>
              <text x={pos.x} y={pos.y + 27} textAnchor="middle" fontSize="11" fontWeight="700" fill="#0d2a33" stroke="#fff" strokeWidth="3" paintOrder="stroke">{t.name}</text>
            </g>
          ))}
          {live.filter((l) => !l.job && l.state !== 'On Leave').map(({ t }) => (
            <g key={t.id} transform={`translate(${t.home.x} ${t.home.y})`}><circle r="8" fill="#8b8dad" stroke="#fff" strokeWidth="3" /><text x="0" y="22" textAnchor="middle" fontSize="11" fontWeight="600" fill="#475569" stroke="#fff" strokeWidth="3" paintOrder="stroke">{t.name}</text></g>
          ))}
        </ServiceMap>

        <div className="stack" style={{ gap: 12 }}>
          {shown.map(({ t, job, c, state }) => (
            <div key={t.id} className="trk-card">
              <div className="who-c">
                <Avatar name={t.name} size={40} />
                <div style={{ flex: 1 }}><b>{t.name}</b><small>{job ? `${job.serviceType} - ${c?.name}` : t.title}</small></div>
                <Badge tone={job?.status === 'En Route' ? 'blue' : job ? 'amber' : state === 'On Leave' ? 'red' : 'green'}>{job ? (job.status === 'En Route' ? 'On the way' : 'On site') : state === 'On Leave' ? 'On Leave' : 'Available'}</Badge>
              </div>
              {job && c && <small className="muted"><MapPin size={12} style={{ verticalAlign: -2 }} /> {c.address}</small>}
              <div className="btns">
                <a className="btn" href={`tel:${t.phone.replace(/\s/g, '')}`}><Phone size={14} /> Call</a>
                <button className="btn" onClick={() => toast(`Message sent to ${t.name}`, 'ok')}><MessageSquare size={14} /> Message</button>
              </div>
            </div>
          ))}
          {!shown.length && <Card><Empty text="No technicians in this view." /></Card>}
        </div>
      </div>
    </>
  )
}
