import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useStore } from '../api/store'
import { fmtHour, isoDate } from '../api/format'
import { Card, PageHeader } from '../components/ui'
import { useScoped } from './scope'
import { WOStatus } from '../types'

const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]
const cls = (s: WOStatus) => (s === 'Completed' ? 's-done' : s === 'In Progress' || s === 'En Route' ? 's-prog' : s === 'Cancelled' ? 's-canc' : 's-sched')
const addDays = (iso: string, n: number) => {
  const d = new Date(iso + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const monday = (iso: string) => {
  const d = new Date(iso + 'T00:00:00')
  return addDays(iso, -((d.getDay() + 6) % 7))
}

type WO = ReturnType<typeof useScoped>['workOrders'][number]
function lanes(list: WO[]) {
  const sorted = [...list].sort((a, b) => a.startHour - b.startHour)
  const out: { w: WO; lane: number; of: number }[] = []
  let group: typeof out = []
  let end = -1
  const flush = () => { const n = Math.max(...group.map((g) => g.lane + 1), 1); group.forEach((g) => (g.of = n)); out.push(...group); group = [] }
  for (const w of sorted) {
    if (group.length && w.startHour >= end) { flush(); end = -1 }
    const used = new Set(group.filter((g) => g.w.startHour + g.w.duration > w.startHour).map((g) => g.lane))
    let lane = 0
    while (used.has(lane)) lane++
    group.push({ w, lane, of: 1 })
    end = Math.max(end, w.startHour + w.duration)
  }
  if (group.length) flush()
  return out
}

export default function Appointments() {
  const { customers, technicians } = useStore()
  const { workOrders } = useScoped()
  const nav = useNavigate()
  const [mode, setMode] = useState<'Day' | 'Week'>('Week')
  const [anchor, setAnchor] = useState(isoDate(0))
  const days = useMemo(() => (mode === 'Week' ? Array.from({ length: 7 }, (_, i) => addDays(monday(anchor), i)) : [anchor]), [mode, anchor])
  const step = mode === 'Week' ? 7 : 1
  const label = (iso: string, o: Intl.DateTimeFormatOptions) => new Date(iso + 'T00:00:00').toLocaleDateString('en-US', o)
  const rows = workOrders.filter((w) => w.technicianId && days.includes(w.date))

  return (
    <>
      <PageHeader title="Appointments" sub="Scheduled visits across the week." />
      <div className="toolbar">
        <div className="seg" role="group" aria-label="View">
          {(['Day', 'Week'] as const).map((m) => <button key={m} className={mode === m ? 'on' : ''} onClick={() => setMode(m)}>{m}</button>)}
        </div>
        <button className="icon-btn" aria-label="Previous" onClick={() => setAnchor(addDays(anchor, -step))}><ChevronLeft size={18} /></button>
        <b>{mode === 'Week' ? `${label(days[0], { month: 'short', day: 'numeric' })} - ${label(days[6], { month: 'short', day: 'numeric', year: 'numeric' })}` : label(anchor, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</b>
        <button className="icon-btn" aria-label="Next" onClick={() => setAnchor(addDays(anchor, step))}><ChevronRight size={18} /></button>
        <button className="btn sm" onClick={() => setAnchor(isoDate(0))}>Today</button>
      </div>
      <Card className="p0">
        <div className="cal" style={{ gridTemplateColumns: `56px repeat(${days.length}, minmax(${mode === 'Week' ? 110 : 300}px, 1fr))` }}>
          <div className="cal-h" />
          {days.map((d) => <div key={d} className={`cal-h ${d === isoDate(0) ? 'today' : ''}`}>{label(d, { weekday: 'short' })}<b>{label(d, { day: 'numeric' })}</b></div>)}
          <div>{HOURS.map((h) => <div key={h} className="cal-t">{fmtHour(h).replace(':00', '')}</div>)}</div>
          {days.map((d) => (
            <div key={d} className="cal-col" style={{ height: HOURS.length * 54 }}>
              {HOURS.map((h) => <div key={h} className="line" />)}
              {lanes(rows.filter((w) => w.date === d)).map(({ w, lane, of }) => {
                const c = customers.find((x) => x.id === w.customerId)
                const t = technicians.find((x) => x.id === w.technicianId)
                return (
                  <button key={w.id} className={`ev ${cls(w.status)}`} style={{ top: (w.startHour - 8) * 54 + 2, height: Math.max(w.duration * 54 - 4, 40), left: `calc(${(lane / of) * 100}% + 3px)`, right: `calc(${((of - lane - 1) / of) * 100}% + 3px)` }} onClick={() => nav(`/work-orders/${w.id}`)}>
                    <b>{w.serviceType}</b>{t?.name} · {c?.name}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </Card>
      <div className="cal-legend">
        {[['#6c72d9', 'Scheduled'], ['#e8a317', 'In Progress'], ['#2f7d4f', 'Completed'], ['#c4294f', 'Cancelled']].map(([c, n]) => <span key={n}><i style={{ background: c }} />{n}</span>)}
      </div>
    </>
  )
}
