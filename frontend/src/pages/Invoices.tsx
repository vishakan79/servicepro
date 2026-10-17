import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Download, Printer } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { useStore } from '../api/store'
import { fmtDate, inr } from '../api/format'
import { Avatar, Badge, Card, Empty, PageHeader } from '../components/ui'
import { Invoice } from '../types'
import { downloadInvoicePdf } from '../api/invoicePdf'
import { useScoped } from './scope'

export const totalOf = (i: Invoice) => {
  const sub = i.lines.reduce((a, l) => a + l.qty * l.unit, 0)
  return { sub, gst: Math.round(sub * 0.18), total: sub + Math.round(sub * 0.18) }
}

export function InvoiceList() {
  const { customers } = useStore()
  const { invoices } = useScoped()
  const nav = useNavigate()
  const [st, setSt] = useState('All')
  const rows = invoices.filter((i) => st === 'All' || i.status === st)
  const due = invoices.filter((i) => i.status !== 'Paid').reduce((a, i) => a + totalOf(i).total, 0)
  return (
    <>
      <PageHeader title="Invoices" sub={`Outstanding balance: ${inr(due)}`} />
      <div className="toolbar">
        <select value={st} onChange={(e) => setSt(e.target.value)} aria-label="Status">{['All', 'Paid', 'Pending', 'Overdue'].map((o) => <option key={o}>{o}</option>)}</select>
      </div>
      <Card>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead><tr><th>Invoice</th><th>Customer</th><th>Issued</th><th>Due</th><th className="num">Amount</th><th>Status</th></tr></thead>
            <tbody>
              {rows.map((i) => (
                <tr key={i.id} className="click" onClick={() => nav(`/invoices/${i.id}`)}>
                  <td><b className="id">{i.number}</b></td><td>{customers.find((c) => c.id === i.customerId)?.name}</td>
                  <td>{fmtDate(i.issued)}</td><td>{fmtDate(i.due)}</td><td className="num"><b>{inr(totalOf(i).total)}</b></td><td><Badge>{i.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && <Empty text="No invoices found." />}
        </div>
      </Card>
    </>
  )
}

export function InvoiceDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const { customers, markPaid, toast } = useStore()
  const { invoices } = useScoped()
  const [method, setMethod] = useState('UPI')
  const inv = invoices.find((i) => i.id === Number(id))
  if (!inv) return <Card><Empty text="Invoice not found." /><div style={{ textAlign: 'center' }}><Link to="/invoices">Back to invoices</Link></div></Card>
  const c = customers.find((x) => x.id === inv.customerId)!
  const t = totalOf(inv)
  const staff = user!.role !== 'CUSTOMER'
  return (
    <>
      <PageHeader title={<>Invoice #{inv.number} <Badge>{inv.status}</Badge></>}>
        <button className="btn" onClick={() => window.print()}><Printer size={16} /> Print</button>
        <button className="btn" onClick={() => downloadInvoicePdf(inv, c, t).catch(() => toast('Could not create the PDF', 'warn'))}><Download size={16} /> Download</button>
      </PageHeader>
      <div className="g-ms">
        <Card>
          <div className="inv-hd">
            <div className="who-c" style={{ alignItems: 'flex-start' }}>
              <Avatar name={c.name} size={46} />
              <div className="info-l"><b>{c.name}</b><span>{c.phone}</span><span>{c.email}</span><span>{c.address}</span></div>
            </div>
            <dl className="kv" style={{ gridTemplateColumns: '110px auto' }}>
              <dt>Invoice Date</dt><dd>{fmtDate(inv.issued)}</dd><dt>Due Date</dt><dd>{fmtDate(inv.due)}</dd>
              <dt>Work Order</dt><dd><Link to={`/work-orders/${inv.woId}`}>#{inv.woId}</Link></dd>
            </dl>
          </div>
          <div className="tbl-wrap" style={{ marginTop: 18 }}>
            <table className="tbl">
              <thead><tr><th>#</th><th>Description</th><th className="num">Qty</th><th className="num">Unit Price</th><th className="num">Amount</th></tr></thead>
              <tbody>{inv.lines.map((l, k) => <tr key={k}><td>{k + 1}</td><td>{l.desc}</td><td className="num">{l.qty}</td><td className="num">{inr(l.unit)}</td><td className="num">{inr(l.unit * l.qty)}</td></tr>)}</tbody>
            </table>
          </div>
          <div className="totals">
            <div><span>Subtotal</span><span>{inr(t.sub)}</span></div>
            <div><span>GST (18%)</span><span>{inr(t.gst)}</span></div>
            <div className="grand"><span>Total</span><span>{inr(t.total)}</span></div>
          </div>
        </Card>
        <Card title="Payment Information">
          <dl className="kv" style={{ gridTemplateColumns: '110px 1fr' }}>
            <dt>Payment Status</dt><dd><Badge>{inv.status}</Badge></dd>
            <dt>Method</dt><dd>{inv.method ?? '-'}</dd>
            <dt>Transaction ID</dt><dd style={{ wordBreak: 'break-all' }}>{inv.txn ?? '-'}</dd>
          </dl>
          {inv.status !== 'Paid' && (
            <div className="stack" style={{ gap: 10, marginTop: 16 }}>
              <select value={method} onChange={(e) => setMethod(e.target.value)} aria-label="Payment method">{['UPI', 'Credit Card', 'Bank Transfer', 'Cash'].map((m) => <option key={m}>{m}</option>)}</select>
              <button className="btn p" onClick={() => markPaid(inv.id, method)}>{staff ? 'Record Payment' : 'Pay Now'}</button>
            </div>
          )}
        </Card>
      </div>
    </>
  )
}
