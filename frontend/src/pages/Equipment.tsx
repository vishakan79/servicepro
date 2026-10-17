import { useEffect, useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { api } from '../api/http'
import { useStore } from '../api/store'
import { useAuth } from '../auth/AuthContext'
import { Badge, Card, Empty, PageHeader } from '../components/ui'

interface Eq {
  id: number; customerId: number; customerName: string; name: string; category?: string | null; brandModel?: string | null
  serialNo?: string | null; installDate?: string | null; warrantyUntil?: string | null; amcUntil?: string | null
  nextService?: string | null; notes?: string | null
}
const blank = { customerId: 0, name: '', category: '', brandModel: '', serialNo: '', installDate: '', warrantyUntil: '', amcUntil: '', nextService: '', notes: '' }

const today = () => new Date().toISOString().slice(0, 10)
const daysTo = (d?: string | null) => (d ? Math.round((new Date(d).getTime() - new Date(today()).getTime()) / 86400000) : null)
function dateBadge(d: string | null | undefined, label: string) {
  const n = daysTo(d)
  if (n === null) return <span className="muted">-</span>
  if (n < 0) return <Badge tone="danger">{`${label} expired`}</Badge>
  if (n <= 30) return <Badge tone="warn">{`${d} (${n}d)`}</Badge>
  return <span>{d}</span>
}

export default function Equipment() {
  const { user } = useAuth()
  const { customers, toast } = useStore()
  const staff = user?.role === 'ADMIN' || user?.role === 'MANAGER'
  const [rows, setRows] = useState<Eq[] | null>(null)
  const [form, setForm] = useState<(typeof blank & { id?: number }) | null>(null)
  const [busy, setBusy] = useState(false)
  const load = () => api<Eq[]>('/equipment').then(setRows).catch((e) => { setRows([]); toast(e instanceof Error ? e.message : 'Could not load', 'warn') })
  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k: keyof typeof blank, v: string | number) => setForm((f) => (f ? { ...f, [k]: v } : f))
  const save = async () => {
    if (!form) return
    if (!form.customerId || !form.name.trim()) return toast('Customer and equipment name are required', 'warn')
    const body: Record<string, unknown> = { ...form }
    for (const k of ['category', 'brandModel', 'serialNo', 'installDate', 'warrantyUntil', 'amcUntil', 'nextService', 'notes']) if (!body[k]) body[k] = null
    delete body.id
    setBusy(true)
    try {
      await api(form.id ? `/equipment/${form.id}` : '/equipment', { method: form.id ? 'PUT' : 'POST', body })
      toast('Equipment saved', 'ok'); setForm(null); load()
    } catch (e) { toast(e instanceof Error ? e.message : 'Could not save', 'warn') } finally { setBusy(false) }
  }
  const remove = async (id: number) => {
    if (!window.confirm('Delete this equipment record?')) return
    try { await api(`/equipment/${id}`, { method: 'DELETE' }); load() } catch (e) { toast(e instanceof Error ? e.message : 'Could not delete', 'warn') }
  }
  const dueSoon = (rows ?? []).filter((r) => { const n = daysTo(r.nextService); return n !== null && n <= 30 }).length

  const input = (k: keyof typeof blank, label: string, type = 'text') => (
    <label className="field"><span className="field-l">{label}</span>
      <span className="inp"><input type={type} value={form![k] as string} maxLength={k === 'notes' ? 500 : 120} onChange={(e) => set(k, e.target.value)} /></span></label>
  )

  return (
    <>
      <PageHeader title="Equipment & AMC" sub={staff ? 'Customer equipment, warranty and maintenance contracts.' : 'Your equipment, warranty and next service date.'}>
        {staff && <button className="btn p" onClick={() => setForm({ ...blank })}><Plus size={16} /> Add equipment</button>}
      </PageHeader>
      {dueSoon > 0 && <p role="status" style={{ marginBottom: 12 }}><Badge tone="warn">{`${dueSoon} service${dueSoon > 1 ? 's' : ''} due within 30 days`}</Badge></p>}
      {form && (
        <Card title={form.id ? 'Edit equipment' : 'New equipment'}>
          <label className="field"><span className="field-l">Customer</span>
            <span className="inp"><select value={form.customerId} onChange={(e) => set('customerId', Number(e.target.value))}>
              <option value={0}>Select customer</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select></span></label>
          {input('name', 'Equipment name (e.g. Split AC 1.5 ton)')}
          {input('category', 'Category (AC, Electrical, Plumbing...)')}
          {input('brandModel', 'Brand / model')}
          {input('serialNo', 'Serial number')}
          {input('installDate', 'Install date', 'date')}
          {input('warrantyUntil', 'Warranty until', 'date')}
          {input('amcUntil', 'AMC valid until', 'date')}
          {input('nextService', 'Next service due', 'date')}
          {input('notes', 'Notes')}
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn p" disabled={busy} onClick={save}>Save</button>
            <button className="btn" onClick={() => setForm(null)}>Cancel</button>
          </div>
        </Card>
      )}
      <Card className="p0">
        {!rows && <p style={{ padding: 18 }}>Loading…</p>}
        {rows && rows.length === 0 && <Empty text={staff ? 'No equipment yet. Add the first one.' : 'No equipment registered for you yet.'} />}
        {rows && rows.length > 0 && (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead><tr><th>Equipment</th><th>Customer</th><th>Serial</th><th>Warranty</th><th>AMC</th><th>Next service</th>{staff && <th />}</tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td><b>{r.name}</b><div>{[r.category, r.brandModel].filter(Boolean).join(' · ')}</div></td>
                    <td>{r.customerName}</td>
                    <td>{r.serialNo || '-'}</td>
                    <td>{dateBadge(r.warrantyUntil, 'Warranty')}</td>
                    <td>{dateBadge(r.amcUntil, 'AMC')}</td>
                    <td>{dateBadge(r.nextService, 'Service')}</td>
                    {staff && (
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <button className="icon-btn" aria-label="Edit" onClick={() => setForm({ ...blank, ...Object.fromEntries(Object.entries(r).map(([k, v]) => [k, v ?? ''])) } as typeof blank & { id: number })}><Pencil size={16} /></button>
                        <button className="icon-btn" aria-label="Delete" onClick={() => remove(r.id)}><Trash2 size={16} /></button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  )
}
