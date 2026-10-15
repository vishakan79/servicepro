import { useEffect, useState } from 'react'
import { listInquiries, type Inquiry } from '../api/inquiry'
import { Badge, Card, PageHeader } from '../components/ui'

export default function Inquiries() {
  const [rows, setRows] = useState<Inquiry[] | null>(null)
  const [err, setErr] = useState('')
  useEffect(() => { listInquiries().then(setRows).catch((e) => setErr(e instanceof Error ? e.message : 'Could not load')) }, [])
  return (
    <>
      <PageHeader title="Demo requests" sub="Enquiries sent from the public website." />
      <Card>
        {err && <p role="alert" style={{ padding: 18 }}>{err}</p>}
        {!rows && !err && <p style={{ padding: 18 }}>Loading…</p>}
        {rows && rows.length === 0 && <p style={{ padding: 18 }}>No requests yet.</p>}
        {rows && rows.length > 0 && (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead><tr><th>Received</th><th>Name</th><th>Contact</th><th>Interest</th><th>Message</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>{new Date(r.createdAt).toLocaleString()}</td>
                    <td><b>{r.name}</b><div>{r.company}</div></td>
                    <td><a href={`mailto:${r.email}`}>{r.email}</a><div>{r.phone}</div></td>
                    <td>{r.interest && <Badge tone="info">{r.interest}</Badge>}</td>
                    <td style={{ maxWidth: 360, whiteSpace: 'normal' }}>{r.message}</td>
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
