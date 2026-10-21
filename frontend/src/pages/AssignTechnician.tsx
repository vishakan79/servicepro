import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Search, Sparkles, Wand2 } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { useStore } from '../api/store'
import { fmtHour, isoDate } from '../api/format'
import { Avatar, Badge, Card, Empty, Field, PageHeader, Stars } from '../components/ui'
import { SKILLS } from '../api/format'
import { aiJson, aiMessage } from '../api/ai'

const SLOTS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17]

export default function AssignTechnician() {
  const { id } = useParams()
  const { user } = useAuth()
  const s = useStore()
  const nav = useNavigate()
  const w = s.workOrders.find((x) => x.id === Number(id))
  const [q, setQ] = useState('')
  const [techId, setTechId] = useState<number | null>(w?.technicianId ?? null)
  const [date, setDate] = useState(w?.date ?? isoDate(1))
  const [hour, setHour] = useState(w?.startHour ?? 10)
  const [dur, setDur] = useState(w?.duration ?? 2)
  const [notes, setNotes] = useState(w?.notes ?? '')
  const [err, setErr] = useState('')
  const [aiBusy, setAiBusy] = useState(false)

  const need = w ? SKILLS[w.serviceType] ?? [] : []
  const list = useMemo(
    () => s.technicians.filter((t) => !q || t.name.toLowerCase().includes(q.toLowerCase()) || t.skills.join(' ').toLowerCase().includes(q.toLowerCase())),
    [s.technicians, q],
  )
  if (!w) return <Card><Empty text="Work order not found." /></Card>

  const busy = (tid: number, h: number) =>
    s.workOrders.some((o) => o.id !== w.id && o.technicianId === tid && o.date === date && !['Cancelled', 'Created'].includes(o.status) && h < o.startHour + o.duration && o.startHour < h + dur)

  const submit = async () => {
    if (!techId) { setErr('Select a technician first.'); return }
    const e = await s.assign(w.id, techId, date, hour, dur, notes, user!.name)
    if (e) { setErr(e); return }
    nav(`/work-orders/${w.id}`)
  }
  const aiPick = async () => {
    setAiBusy(true); setErr('')
    try {
      const techs = s.technicians.map((t) => ({
        id: t.id, name: t.name, skills: t.skills, rating: t.rating, onLeave: t.status === 'On Leave',
        jobsThatDay: s.workOrders.filter((o) => o.technicianId === t.id && o.date === date && !['Cancelled', 'Completed'].includes(o.status)).length,
      }))
      const r = await aiJson<{ technicianId: number | null; reason?: string }>('ASSIGN', { job: { type: w.serviceType, description: w.description, priority: w.priority, date }, technicians: techs })
      const t = s.technicians.find((x) => x.id === r.technicianId)
      if (t) { setTechId(t.id); s.toast(`AI suggests ${t.name}${r.reason ? `: ${r.reason}` : ''}`, 'info') }
      else s.toast(r.reason || 'AI found no suitable technician', 'info')
    } catch (ex) { setErr(aiMessage(ex)) } finally { setAiBusy(false) }
  }
  const auto = () => {
    const t = s.autoPick(w.id)
    if (t) { setTechId(t); setErr(''); s.toast(`Best match: ${s.technicians.find((x) => x.id === t)!.name}`, 'info') }
  }

  return (
    <>
      <PageHeader title="Assign Technician" sub={`Select a technician for work order ${w.code} (${w.serviceType}).`}>
        <button className="btn" onClick={auto}><Wand2 size={16} /> Auto-assign</button>
        <button className="btn ai-btn" onClick={aiPick} disabled={aiBusy}><Sparkles size={16} /> {aiBusy ? 'Thinking…' : 'AI recommend'}</button>
      </PageHeader>
      <div className="g-2-1">
        <Card title="Available Technicians">
          <div className="search" style={{ maxWidth: 'none', marginBottom: 14 }}>
            <Search size={16} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search technicians..." aria-label="Search technicians" />
          </div>
          <div className="stack" style={{ gap: 10 }}>
            {list.map((t) => {
              const st = s.techStatusOf(t)
              const match = t.skills.some((k) => need.includes(k))
              return (
                <button key={t.id} className={`tech-row ${techId === t.id ? 'on' : ''}`} disabled={st === 'On Leave'} onClick={() => { setTechId(t.id); setErr('') }} aria-pressed={techId === t.id}>
                  <Avatar name={t.name} size={44} />
                  <span className="grow">
                    <b>{t.name}</b>
                    <small>{t.title}</small>
                    <small><Stars value={t.rating} size={12} /> {t.rating} ({t.jobs} jobs){match && <> · <b style={{ color: 'var(--green)' }}>Skill match</b></>}</small>
                  </span>
                  <Badge>{st === 'On Duty' ? 'On Duty' : st}</Badge>
                </button>
              )
            })}
            {!list.length && <Empty text="No technicians match your search." />}
          </div>
        </Card>

        <Card title="Schedule Details">
          <div className="stack" style={{ gap: 14 }}>
            <Field label="Preferred Date">
              <input type="date" value={date} min={isoDate(0)} onChange={(e) => { setDate(e.target.value); setErr('') }} />
            </Field>
            <Field label="Start Time">
              <div className="slot-grid">
                {SLOTS.map((h) => (
                  <button key={h} type="button" className={`slot ${hour === h ? 'on' : ''}`} disabled={!!techId && busy(techId, h)} onClick={() => { setHour(h); setErr('') }}>{fmtHour(h)}</button>
                ))}
              </div>
            </Field>
            <Field label="Duration">
              <select value={dur} onChange={(e) => setDur(Number(e.target.value))}>
                {[1, 2, 3, 4].map((d) => <option key={d} value={d}>{d} hour{d > 1 ? 's' : ''}</option>)}
              </select>
            </Field>
            <Field label="Technician Notes">
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Additional notes for technician..." />
            </Field>
            {err && <div className="err" role="alert">{err}</div>}
            <div className="row" style={{ justifyContent: 'flex-end' }}>
              <Link to={`/work-orders/${w.id}`} className="btn">Cancel</Link>
              <button className="btn p" onClick={submit}>Assign Technician</button>
            </div>
          </div>
        </Card>
      </div>
    </>
  )
}
