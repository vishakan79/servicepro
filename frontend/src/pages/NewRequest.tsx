import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, ImagePlus, Search, X } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { useStore } from '../api/store'
import { ISSUE_TYPES } from '../api/format'
import { Avatar, Badge, Card, Field, PageHeader } from '../components/ui'
import { Priority } from '../types'

export default function NewRequest() {
  const { user } = useAuth()
  const s = useStore()
  const nav = useNavigate()
  const isCustomer = user!.role === 'CUSTOMER'
  const [tab, setTab] = useState<'existing' | 'new'>('existing')
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [custId, setCustId] = useState<number | null>(isCustomer ? user!.customerId ?? null : null)
  const [nc, setNc] = useState({ name: '', phone: '', email: '', address: '' })
  const [issue, setIssue] = useState('AC Not Cooling')
  const [pri, setPri] = useState<Priority>('High')
  const [desc, setDesc] = useState('')
  const [files, setFiles] = useState<{ name: string; url: string }[]>([])
  const [errs, setErrs] = useState<Record<string, string>>({})
  const fileRef = useRef<HTMLInputElement>(null)

  const matches = useMemo(() => {
    const t = q.toLowerCase()
    return s.customers.filter((c) => !t || [c.name, c.phone, c.email].some((v) => v.toLowerCase().includes(t))).slice(0, 6)
  }, [q, s.customers])
  const cust = s.customers.find((c) => c.id === custId)

  const addFiles = (list: FileList | null) => {
    if (!list) return
    const next = [...files]
    for (const f of Array.from(list)) {
      if (!/^image\/(png|jpe?g)$/.test(f.type)) { setErrs((e) => ({ ...e, files: 'Only PNG or JPG images are allowed' })); continue }
      if (f.size > 5 * 1024 * 1024) { setErrs((e) => ({ ...e, files: `${f.name} is larger than 5 MB` })); continue }
      next.push({ name: f.name, url: URL.createObjectURL(f) })
    }
    setFiles(next.slice(0, 5))
  }

  const [busy, setBusy] = useState(false)
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const er: Record<string, string> = {}
    let id = custId
    if (tab === 'new' && !isCustomer) {
      if (!nc.name.trim()) er.name = 'Name is required'
      if (!/^[+\d][\d\s-]{7,}$/.test(nc.phone.trim())) er.phone = 'Enter a valid phone number'
      if (!/^\S+@\S+\.\S+$/.test(nc.email.trim())) er.email = 'Enter a valid email'
      if (!nc.address.trim()) er.address = 'Address is required'
    } else if (!id) er.customer = 'Select a customer'
    if (desc.trim().length < 10) er.desc = 'Describe the issue (at least 10 characters)'
    setErrs(er)
    if (Object.keys(er).length) return
    setBusy(true)
    try {
      if (tab === 'new' && !isCustomer) id = await s.addCustomer({ name: nc.name.trim(), phone: nc.phone.trim(), email: nc.email.trim(), address: nc.address.trim() })
      const woId = await s.createRequest({ customerId: id!, issueType: issue, priority: pri, description: desc.trim(), images: files.length, by: user!.name })
      nav(`/work-orders/${woId}`)
    } catch (ex) {
      setErrs({ form: ex instanceof Error ? ex.message : 'Could not create the request' })
    } finally { setBusy(false) }
  }

  return (
    <form onSubmit={submit} noValidate>
      <PageHeader title="Create Service Request" />
      <div className="g-ms">
        <div className="stack">
          <Card title="Customer Information">
            {!isCustomer && (
              <div className="tabs">
                <button type="button" className={`tab ${tab === 'existing' ? 'on' : ''}`} onClick={() => setTab('existing')}>Existing Customer</button>
                <button type="button" className={`tab ${tab === 'new' ? 'on' : ''}`} onClick={() => setTab('new')}>New Customer</button>
              </div>
            )}
            {tab === 'existing' || isCustomer ? (
              <div className="stack" style={{ gap: 12 }}>
                {!isCustomer && (
                  <div className="rel">
                    <div className="search" style={{ maxWidth: 'none', height: 42, background: '#fff' }}>
                      <Search size={16} />
                      <input value={q} onChange={(e) => { setQ(e.target.value); setOpen(true) }} onFocus={() => setOpen(true)} placeholder="Search customer by name, phone or email..." aria-label="Search customer" />
                      <ChevronDown size={16} />
                    </div>
                    {open && (
                      <div className="drop pick" style={{ left: 0, right: 0, top: 46 }}>
                        {matches.map((c) => (
                          <button type="button" key={c.id} className="drop-b" onClick={() => { setCustId(c.id); setOpen(false); setQ(''); setErrs((e) => ({ ...e, customer: '' })) }}>
                            <Avatar name={c.name} size={28} /> <span>{c.name} <small className="muted">{c.phone}</small></span>
                          </button>
                        ))}
                        {!matches.length && <div className="empty">No customers found</div>}
                      </div>
                    )}
                  </div>
                )}
                {cust ? (
                  <div className="picked">
                    <Avatar name={cust.name} size={44} />
                    <div><b>{cust.name}</b><div className="muted">{cust.phone}</div><div className="muted">{cust.email}</div><div className="muted">{cust.address}</div></div>
                    {!isCustomer && <button type="button" className="btn sm" onClick={() => setCustId(null)}>Change</button>}
                  </div>
                ) : <p className="muted">Search and pick a customer above.</p>}
                {errs.customer && <span className="field-e">{errs.customer}</span>}
              </div>
            ) : (
              <div className="grid-2">
                <Field label="Full name" required error={errs.name}><input type="text" className={errs.name ? 'bad' : ''} value={nc.name} onChange={(e) => setNc({ ...nc, name: e.target.value })} /></Field>
                <Field label="Phone" required error={errs.phone}><input type="tel" className={errs.phone ? 'bad' : ''} value={nc.phone} onChange={(e) => setNc({ ...nc, phone: e.target.value })} placeholder="+91 98765 43210" /></Field>
                <Field label="Email" required error={errs.email}><input type="email" className={errs.email ? 'bad' : ''} value={nc.email} onChange={(e) => setNc({ ...nc, email: e.target.value })} /></Field>
                <Field label="Address" required error={errs.address}><input type="text" className={errs.address ? 'bad' : ''} value={nc.address} onChange={(e) => setNc({ ...nc, address: e.target.value })} /></Field>
              </div>
            )}
          </Card>

          <Card title="Service Details">
            <div className="grid-2" style={{ marginBottom: 14 }}>
              <Field label="Issue Type" required>
                <select value={issue} onChange={(e) => setIssue(e.target.value)}>{ISSUE_TYPES.map((t) => <option key={t}>{t}</option>)}</select>
              </Field>
              <Field label="Priority" required>
                <select value={pri} onChange={(e) => setPri(e.target.value as Priority)}>{['High', 'Medium', 'Low'].map((t) => <option key={t}>{t}</option>)}</select>
              </Field>
            </div>
            <Field label="Description" required error={errs.desc}>
              <textarea className={errs.desc ? 'bad' : ''} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Describe the issue in detail..." />
            </Field>
            <div style={{ marginTop: 14 }}>
              <span className="field-l">Images (Optional)</span>
              <div className="drop-zone" onClick={() => fileRef.current?.click()} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files) }} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && fileRef.current?.click()}>
                <ImagePlus size={22} />
                <span>Click to upload images or drag and drop</span>
                <small>PNG, JPG up to 5MB each (max 5)</small>
                <input ref={fileRef} type="file" accept="image/png,image/jpeg" multiple hidden onChange={(e) => addFiles(e.target.files)} />
              </div>
              {errs.files && <span className="field-e">{errs.files}</span>}
              {files.length > 0 && (
                <div className="thumbs">
                  {files.map((f, i) => (
                    <div key={f.url} className="thumb"><img src={f.url} alt={f.name} /><button type="button" aria-label={`Remove ${f.name}`} onClick={() => setFiles(files.filter((_, k) => k !== i))}><X size={12} /></button></div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>

        <Card title="Request Summary" className="sticky">
          <dl className="kv" style={{ gridTemplateColumns: '100px 1fr' }}>
            <dt>Customer</dt><dd>{(tab === 'new' && !isCustomer ? nc.name : cust?.name) || '-'}</dd>
            <dt>Issue Type</dt><dd>{issue}</dd>
            <dt>Priority</dt><dd><Badge>{pri}</Badge></dd>
            <dt>Created By</dt><dd>{user!.name}</dd>
            <dt>Status</dt><dd><Badge>New</Badge></dd>
          </dl>
          {errs.form && <div className="err" role="alert" style={{ marginTop: 14 }}>{errs.form}</div>}
          <button type="submit" className="btn p big" disabled={busy} style={{ width: '100%', marginTop: 18 }}>{busy ? 'Submitting…' : 'Submit Request'}</button>
        </Card>
      </div>
    </form>
  )
}
