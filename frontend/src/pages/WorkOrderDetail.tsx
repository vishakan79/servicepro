import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Mail, MapPin, Phone, Sparkles, UserPlus } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { useStore } from '../api/store'
import { fmtDate, fmtDateTime, fmtHour, inr } from '../api/format'
import { Avatar, Badge, Card, Empty, PageHeader, Stars } from '../components/ui'
import { WOStatus } from '../types'
import { aiMessage, aiRun } from '../api/ai'
import { useScoped } from './scope'

const NEXT: Record<WOStatus, WOStatus[]> = {
  Created: ['Cancelled'], Assigned: ['En Route', 'Cancelled'], 'En Route': ['In Progress', 'Cancelled'],
  'In Progress': ['Completed', 'Cancelled'], Completed: [], Cancelled: [],
}
const TABS = ['Overview', 'Job Details', 'Parts & Inventory', 'Work Log', 'Customer Feedback'] as const

export default function WorkOrderDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const s = useStore()
  const { workOrders } = useScoped()
  const nav = useNavigate()
  const w = workOrders.find((x) => x.id === Number(id))
  const [tab, setTab] = useState<(typeof TABS)[number]>('Overview')
  const [next, setNext] = useState('')
  const [err, setErr] = useState('')
  const [partId, setPartId] = useState(0)
  const [qty, setQty] = useState(1)
  const [perr, setPerr] = useState('')
  const [note, setNote] = useState('')
  const [stars, setStars] = useState(0)
  const [comment, setComment] = useState('')
  const [aiBusy, setAiBusy] = useState('')
  const [aiOut, setAiOut] = useState('')
  const ask = async (kind: 'ASSIST' | 'NOTE_SUMMARY') => {
    setAiBusy(kind); setAiOut('')
    try {
      const notes = w!.log.map((l) => l.text).join('\n')
      setAiOut(await aiRun(kind, kind === 'ASSIST'
        ? { type: w!.serviceType, description: w!.description, notes }
        : `Work notes:\n${notes}`))
    } catch (ex) { setAiOut(aiMessage(ex)) } finally { setAiBusy('') }
  }

  if (!w) {
    return (
      <Card>
        <Empty text="This work order doesn't exist or you don't have access to it." />
        <div style={{ textAlign: 'center' }}><Link to="/work-orders">Back to work orders</Link></div>
      </Card>
    )
  }
  const cust = s.customers.find((c) => c.id === w.customerId)!
  const tech = s.technicians.find((t) => t.id === w.technicianId)
  const staff = user!.role === 'ADMIN' || user!.role === 'MANAGER'
  const canWork = staff || user!.role === 'TECHNICIAN'
  const open = w.status !== 'Completed' && w.status !== 'Cancelled'
  const options = NEXT[w.status].filter((o) => (staff ? true : o !== 'Cancelled'))
  const startedAt = w.timeline.find((t) => t.label === 'Work in Progress')?.at
  const doneAt = w.timeline.find((t) => t.label === 'Work Completed')?.at
  const est = `${fmtDate(w.date)} ${fmtHour(w.startHour + w.duration)}`

  const update = async () => {
    const target = (next || options[0]) as WOStatus
    if (!target) return
    if (target === 'Completed' && w.checklist.some((c) => !c.done)) { setErr('Complete all checklist items (Job Details tab) before closing the job.'); return }
    setErr('')
    await s.setStatus(w.id, target, user!.name)
    setNext('')
  }
  const addPart = async () => {
    const e = await s.addPart(w.id, partId, qty)
    setPerr(e ?? '')
    if (!e) setQty(1)
  }
  const partsTotal = w.parts.reduce((a, p) => a + p.qty * (s.parts.find((x) => x.id === p.partId)?.price ?? 0), 0)

  return (
    <>
      <PageHeader title={<>Work Order #{w.code} <Badge>{w.status}</Badge></>} sub={`${w.serviceType} for ${cust.name}`}>
        {staff && open && (
          <button className="btn p" onClick={() => nav(`/work-orders/${w.id}/assign`)}><UserPlus size={17} /> {tech ? 'Reassign' : 'Assign Technician'}</button>
        )}
      </PageHeader>

      <div className="tabs" role="tablist">
        {TABS.map((t) => <button key={t} role="tab" aria-selected={tab === t} className={`tab ${tab === t ? 'on' : ''}`} onClick={() => setTab(t)}>{t}</button>)}
      </div>

      {tab === 'Overview' && (
        <div className="stack">
          <div className="grid-3">
            <Card title="Customer Details">
              <div className="who-c" style={{ alignItems: 'flex-start' }}>
                <Avatar name={cust.name} size={46} />
                <div className="info-l">
                  <b>{cust.name}</b>
                  <span><Phone size={13} /> {cust.phone}</span>
                  <span><Mail size={13} /> {cust.email}</span>
                  <span><MapPin size={13} /> {cust.address}</span>
                </div>
              </div>
            </Card>
            <Card title="Service Information">
              <dl className="kv">
                <dt>Service Type</dt><dd>{w.serviceType}</dd>
                <dt>Priority</dt><dd><Badge>{w.priority}</Badge></dd>
                <dt>Created Date</dt><dd>{fmtDate(w.timeline[0].at)}</dd>
                <dt>{tech ? 'Scheduled' : 'Preferred Date'}</dt><dd>{fmtDate(w.date)}{tech && `, ${fmtHour(w.startHour)}`}</dd>
              </dl>
              <p className="muted" style={{ marginTop: 12 }}>{w.description}</p>
            </Card>
            <Card title="Assigned Technician">
              {tech ? (
                <div className="who-c" style={{ alignItems: 'flex-start' }}>
                  <Avatar name={tech.name} size={46} />
                  <div className="info-l">
                    <b>{tech.name}</b>
                    <span className="muted">{tech.title}</span>
                    <span><Phone size={13} /> {tech.phone}</span>
                    <span><Stars value={tech.rating} size={13} /> {tech.rating} ({tech.jobs} jobs)</span>
                  </div>
                </div>
              ) : <Empty text="No technician assigned yet." />}
            </Card>
          </div>

          <div className="g-2-1">
            <Card title="Work Order Timeline">
              <ol className="tl">
                {w.timeline.map((t, i) => (
                  <li key={i} className={i === w.timeline.length - 1 && open ? 'cur' : 'done'}>
                    <i />
                    <div><b>{t.label}</b><small>{fmtDateTime(t.at)}</small></div>
                    <span className="muted">by {t.by}</span>
                  </li>
                ))}
              </ol>
            </Card>
            <Card title="Current Status">
              <dl className="kv" style={{ gridTemplateColumns: '130px 1fr' }}>
                <dt>Current Status</dt><dd><Badge>{w.status}</Badge></dd>
                <dt>Start Time</dt><dd>{startedAt ? fmtDateTime(startedAt) : '-'}</dd>
                <dt>Est. Completion</dt><dd>{tech ? est : '-'}</dd>
                <dt>Actual Completion</dt><dd>{doneAt ? fmtDateTime(doneAt) : '-'}</dd>
              </dl>
              {canWork && options.length > 0 && (user!.role !== 'TECHNICIAN' || w.technicianId === user!.technicianId) && w.status !== 'Created' || (staff && options.length > 0) ? (
                <div className="stack" style={{ gap: 10, marginTop: 16 }}>
                  <select value={next || options[0]} onChange={(e) => setNext(e.target.value)} aria-label="New status">
                    {options.map((o) => <option key={o}>{o}</option>)}
                  </select>
                  {err && <span className="field-e">{err}</span>}
                  <button className="btn p" onClick={update}>Update Status</button>
                </div>
              ) : null}
            </Card>
          </div>
        </div>
      )}

      {tab === 'Job Details' && (
        <Card title="Checklist">
          <p className="muted" style={{ marginBottom: 12 }}>{w.description}</p>
          <ul className="check">
            {w.checklist.map((c, i) => (
              <li key={c.label}>
                <label><input type="checkbox" checked={c.done} disabled={!canWork || !open} onChange={() => s.toggleCheck(w.id, i)} /> <span className={c.done ? 'strike' : ''}>{c.label}</span></label>
              </li>
            ))}
          </ul>
          <p className="muted" style={{ marginTop: 12 }}>{w.checklist.filter((c) => c.done).length} of {w.checklist.length} completed</p>
          {canWork && (
            <div style={{ marginTop: 12 }}>
              <button type="button" className="btn sm ai-btn" disabled={!!aiBusy} onClick={() => ask('ASSIST')}><Sparkles size={14} /> {aiBusy === 'ASSIST' ? 'Thinking…' : 'AI troubleshooting help'}</button>
              {aiOut && <div className="ai-note">{aiOut}</div>}
            </div>
          )}
        </Card>
      )}

      {tab === 'Parts & Inventory' && (
        <Card title="Parts used">
          <div className="tbl-wrap">
            <table className="tbl">
              <thead><tr><th>Code</th><th>Part</th><th className="num">Qty</th><th className="num">Unit</th><th className="num">Amount</th></tr></thead>
              <tbody>
                {w.parts.map((p) => {
                  const part = s.parts.find((x) => x.id === p.partId)!
                  return <tr key={p.partId}><td>{part.code}</td><td>{part.name}</td><td className="num">{p.qty}</td><td className="num">{inr(part.price)}</td><td className="num">{inr(part.price * p.qty)}</td></tr>
                })}
                {!w.parts.length && <tr><td colSpan={5} className="empty">No parts used yet</td></tr>}
              </tbody>
              {w.parts.length > 0 && <tfoot><tr><td colSpan={4} className="num"><b>Parts total</b></td><td className="num"><b>{inr(partsTotal)}</b></td></tr></tfoot>}
            </table>
          </div>
          {canWork && open && (
            <div className="add-part">
              <select value={partId} onChange={(e) => { setPartId(Number(e.target.value)); setPerr('') }} aria-label="Part">
                <option value={0}>Select a part...</option>
                {s.parts.map((p) => <option key={p.id} value={p.id} disabled={p.stock === 0}>{p.code} · {p.name} ({p.stock} in stock)</option>)}
              </select>
              <input type="number" min={1} value={qty} onChange={(e) => setQty(Number(e.target.value))} aria-label="Quantity" style={{ width: 90 }} />
              <button className="btn p" onClick={addPart}>Add part</button>
              {perr && <span className="field-e">{perr}</span>}
            </div>
          )}
        </Card>
      )}

      {tab === 'Work Log' && (
        <Card title="Work Log">
          {canWork && open && (
            <div className="stack" style={{ gap: 8, marginBottom: 14 }}>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a work note..." aria-label="Work note" />
              <div><button className="btn p sm" disabled={!note.trim()} onClick={() => { s.addLog(w.id, note.trim(), user!.name); setNote('') }}>Add note</button></div>
            </div>
          )}
          {canWork && w.log.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <button type="button" className="btn sm ai-btn" disabled={!!aiBusy} onClick={() => ask('NOTE_SUMMARY')}><Sparkles size={14} /> {aiBusy === 'NOTE_SUMMARY' ? 'Thinking…' : 'Summarise notes with AI'}</button>
              {aiOut && <div className="ai-note">{aiOut}</div>}
            </div>
          )}
          <ul className="log">
            {w.log.map((l, i) => <li key={i}><b>{l.by}</b> <small className="muted">{fmtDateTime(l.at)}</small><p>{l.text}</p></li>)}
            {!w.log.length && <Empty text="No notes yet." />}
          </ul>
        </Card>
      )}

      {tab === 'Customer Feedback' && (
        <Card title="Customer Feedback">
          {w.rating ? (
            <div className="stack" style={{ gap: 8 }}>
              <Stars value={w.rating.stars} size={20} />
              <p>{w.rating.comment}</p>
              <small className="muted">{cust.name} · {fmtDate(w.rating.at)}</small>
            </div>
          ) : w.status === 'Completed' && user!.role === 'CUSTOMER' ? (
            <div className="stack" style={{ gap: 10 }}>
              <div className="rate" role="radiogroup" aria-label="Rating">
                {[1, 2, 3, 4, 5].map((n) => <button key={n} role="radio" aria-checked={stars === n} className={n <= stars ? 'on' : ''} onClick={() => setStars(n)} aria-label={`${n} stars`}>★</button>)}
              </div>
              <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="How was the service?" />
              <div><button className="btn p" disabled={!stars} onClick={() => s.rate(w.id, stars, comment.trim() || 'No comment')}>Submit feedback</button></div>
            </div>
          ) : <Empty text={w.status === 'Completed' ? 'The customer has not left feedback yet.' : 'Feedback is available once the job is completed.'} />}
        </Card>
      )}
    </>
  )
}
