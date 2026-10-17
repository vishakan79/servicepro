import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Phone, LogIn, LogOut, CheckCircle2, Navigation, MapPin } from 'lucide-react'
import { useStore } from '../api/store'
import { fmtHour, isoDate } from '../api/format'
import { Badge, Empty, PageHeader } from '../components/ui'
import { useScoped } from './scope'

/** Asks the browser for a position (the user's consent prompt). Resolves null if refused or unavailable. */
function position(): Promise<{ lat: number; lng: number } | null> {
  return new Promise((res) => {
    if (!navigator.geolocation) return res(null)
    navigator.geolocation.getCurrentPosition(
      (p) => res({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => res(null),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 },
    )
  })
}

/** Technician home: today's jobs with large touch targets. */
export default function MyJobs() {
  const s = useStore()
  const { workOrders } = useScoped()
  const nav = useNavigate()
  const [busy, setBusy] = useState<number | null>(null)
  const today = isoDate(0)

  const jobs = workOrders
    .filter((w) => w.status !== 'Cancelled' && (w.status === 'Completed' ? w.date === today : w.date <= today || w.status === 'In Progress' || w.status === 'En Route'))
    .sort((a, b) => a.startHour - b.startHour)

  const go = async (id: number, kind: 'check-in' | 'check-out') => {
    setBusy(id)
    const loc = await position()
    if (!loc) s.toast('Location not shared - recorded without a location', 'info')
    await s.punch(id, kind, loc)
    setBusy(null)
  }

  return (
    <>
      <PageHeader title="My Jobs Today" sub="Check in on arrival, work through the checklist, check out and complete." />
      {!jobs.length && <Empty text="No jobs assigned for today." />}
      <div className="myjobs">
        {jobs.map((w) => {
          const c = s.customers.find((x) => x.id === w.customerId)
          const done = w.checklist.filter((i) => i.done).length
          const active = w.status === 'In Progress'
          const left = w.timeline.some((t) => t.label.startsWith('Technician checked out')) && active
          return (
            <article className="job-card" key={w.id}>
              <header>
                <b className="id">{w.code}</b> <Badge>{w.status}</Badge> <Badge>{w.priority}</Badge>
                <small className="muted"> {fmtHour(w.startHour)}</small>
              </header>
              <h3>{w.serviceType}</h3>
              <p>{w.description}</p>
              {c && (
                <p className="job-addr"><MapPin size={14} /> {c.name} - {c.address}</p>
              )}
              {w.checklist.length > 0 && <small className="muted">Checklist {done}/{w.checklist.length}</small>}
              <div className="job-actions">
                {c?.phone && <a className="btn big" href={`tel:${c.phone}`}><Phone size={18} /> Call</a>}
                {c?.address && <a className="btn big" target="_blank" rel="noreferrer" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.address)}`}><Navigation size={18} /> Directions</a>}
                {(w.status === 'Assigned' || w.status === 'En Route') && (
                  <button className="btn p big" disabled={busy === w.id} onClick={() => go(w.id, 'check-in')}><LogIn size={18} /> Check in &amp; start</button>
                )}
                {active && !left && (
                  <button className="btn big" disabled={busy === w.id} onClick={() => go(w.id, 'check-out')}><LogOut size={18} /> Check out</button>
                )}
                {active && (
                  <button className="btn p big" onClick={() => nav(`/work-orders/${w.id}`)}><CheckCircle2 size={18} /> Checklist &amp; complete</button>
                )}
                <button className="btn big" onClick={() => nav(`/work-orders/${w.id}`)}>Details</button>
              </div>
            </article>
          )
        })}
      </div>
    </>
  )
}
