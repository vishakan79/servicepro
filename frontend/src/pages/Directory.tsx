import { useAuth } from '../auth/AuthContext'
import { useStore } from '../api/store'
import { useCallback, useEffect, useState } from 'react'
import { api, fetchAll } from '../api/http'
import type { UserDto } from '../api/mappers'
import { Avatar, Badge, Card, PageHeader, Stars } from '../components/ui'

export function Customers() {
  const { customers, workOrders } = useStore()
  return (
    <>
      <PageHeader title="Customers" sub="Everyone you provide service to." />
      <Card>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead><tr><th>Customer</th><th>Phone</th><th>Email</th><th>Area</th><th className="num">Jobs</th></tr></thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id}>
                  <td><span className="who-c"><Avatar name={c.name} size={30} />{c.name}</span></td><td>{c.phone}</td><td>{c.email}</td><td>{c.area}</td>
                  <td className="num">{workOrders.filter((w) => w.customerId === c.id).length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  )
}

export function Technicians() {
  const { technicians, workOrders, techStatusOf } = useStore()
  return (
    <>
      <PageHeader title="Technicians" sub="Skills, ratings and live availability." />
      <Card>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead><tr><th>Technician</th><th>Skills</th><th>Rating</th><th className="num">Open jobs</th><th>Status</th></tr></thead>
            <tbody>
              {technicians.map((t) => (
                <tr key={t.id}>
                  <td><span className="who-c"><Avatar name={t.name} size={32} /><span>{t.name}<small>{t.title}</small></span></span></td>
                  <td>{t.skills.map((s) => <span key={s} className="badge blue" style={{ marginRight: 4 }}>{s}</span>)}</td>
                  <td><Stars value={t.rating} size={13} /> {t.rating}</td>
                  <td className="num">{workOrders.filter((w) => w.technicianId === t.id && !['Completed', 'Cancelled'].includes(w.status)).length}</td>
                  <td><Badge>{techStatusOf(t)}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  )
}

export function Users() {
  const [rows, setRows] = useState<UserDto[]>([])
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', dial: '+91', mobile: '', role: 'MANAGER', password: '' })

  const load = useCallback(async () => {
    try { setRows(await fetchAll<UserDto>('/admin/users')); setErr('') } catch (e) { setErr(e instanceof Error ? e.message : 'Could not load users') }
  }, [])
  useEffect(() => { void load() }, [load])

  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true); setErr('')
    try { await fn(); await load() } catch (e) { setErr(e instanceof Error ? e.message : 'Action failed') } finally { setBusy(false) }
  }
  const status = (u: UserDto) => (u.approvalPending ? 'Pending approval' : u.enabled === false ? 'Disabled' : 'Active')
  const invite = (e: React.FormEvent) => {
    e.preventDefault()
    void act(async () => {
      await api('/admin/users', { method: 'POST', body: { name: form.name.trim(), email: form.email.trim(), phone: form.dial + form.mobile.replace(/\D/g, '').replace(/^0+/, ''), role: form.role, password: form.password } })
      setForm({ ...form, name: '', email: '', mobile: '', password: '' })
    })
  }

  return (
    <>
      <PageHeader title="Users & Roles" sub="Approve staff who registered, add staff, and switch accounts on or off." />
      {err && <div className="err" role="alert" style={{ marginBottom: 12 }}>{err}</div>}
      <Card title="Add staff member">
        <form className="invite" onSubmit={invite}>
          <input required minLength={2} maxLength={120} placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input required type="email" maxLength={160} placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input required type="tel" maxLength={15} placeholder="Mobile (e.g. 98765 43210)" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} />
          <input required type="text" minLength={8} maxLength={72} autoComplete="off" placeholder="First password (8+, letter and digit)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <select value={form.dial} onChange={(e) => setForm({ ...form, dial: e.target.value })}><option>+91</option><option>+1</option><option>+44</option><option>+971</option><option>+65</option><option>+61</option></select>
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}><option value="MANAGER">Manager</option><option value="TECHNICIAN">Technician</option><option value="ADMIN">Admin</option></select>
          <button className="btn p" disabled={busy}>Add</button>
        </form>
        <p className="muted" style={{ marginTop: 8 }}>You set their first password and give it to them in person; it is stored only as a hash. Staff who register themselves are verified by SMS and email link, then wait here for Approve.</p>
      </Card>
      <Card>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead><tr><th>User</th><th>Email</th><th>Mobile</th><th>Role</th><th>Status</th><th /></tr></thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id}>
                  <td><span className="who-c"><Avatar name={u.name} size={30} />{u.name}</span></td>
                  <td>{u.email}</td>
                  <td>{u.phone ?? '—'}</td>
                  <td><Badge tone="purple">{u.role}</Badge></td>
                  <td><Badge tone={u.approvalPending ? 'amber' : u.enabled === false ? 'gray' : 'green'}>{status(u)}</Badge></td>
                  <td>
                    {u.approvalPending
                      ? <button className="btn sm" disabled={busy} onClick={() => void act(() => api(`/admin/users/${u.id}/approve`, { method: 'POST' }))}>Approve</button>
                      : u.enabled === false
                        ? <button className="btn sm" disabled={busy} onClick={() => void act(() => api(`/admin/users/${u.id}/enable`, { method: 'POST' }))}>Enable</button>
                        : <button className="btn sm" disabled={busy} onClick={() => void act(() => api(`/admin/users/${u.id}/disable`, { method: 'POST' }))}>Disable</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  )
}

export function Settings() {
  const { user } = useAuth()
  return (
    <>
      <PageHeader title="Settings" sub="Your account." />
      <Card title="Profile">
        <dl className="kv"><dt>Name</dt><dd>{user!.name}</dd><dt>Email</dt><dd>{user!.email}</dd><dt>Role</dt><dd><Badge tone="purple">{user!.role}</Badge></dd></dl>
      </Card>
    </>
  )
}
