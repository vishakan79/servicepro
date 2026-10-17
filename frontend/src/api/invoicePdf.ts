import { Customer, Invoice } from '../types'

const rs = (n: number) => 'Rs. ' + Math.round(n).toLocaleString('en-IN')

/** Builds and downloads an invoice PDF in the browser (jsPDF is loaded on demand). */
export async function downloadInvoicePdf(inv: Invoice, c: Customer, t: { sub: number; gst: number; total: number }) {
  const { jsPDF } = await import('jspdf')
  const d = new jsPDF({ unit: 'pt', format: 'a4' })
  const W = d.internal.pageSize.getWidth()
  let y = 56
  d.setFont('helvetica', 'bold').setFontSize(22).text('ServicePro', 40, y)
  d.setFontSize(11).setFont('helvetica', 'normal').text('TAX INVOICE', W - 40, y, { align: 'right' })
  y += 30
  d.setFontSize(10)
  d.text(`Invoice #: ${inv.number}`, W - 40, y, { align: 'right' }); y += 14
  d.text(`Date: ${inv.issued}`, W - 40, y, { align: 'right' }); y += 14
  d.text(`Due: ${inv.due}`, W - 40, y, { align: 'right' }); y += 14
  d.text(`Status: ${inv.status}`, W - 40, y, { align: 'right' })
  let by = 86
  d.setFont('helvetica', 'bold').text('Bill to', 40, by); by += 14
  d.setFont('helvetica', 'normal')
  for (const line of [c.name, c.phone, c.email, ...d.splitTextToSize(c.address, 240)]) { d.text(String(line), 40, by); by += 14 }
  y = Math.max(y, by) + 24
  d.setDrawColor(200).line(40, y, W - 40, y); y += 18
  d.setFont('helvetica', 'bold')
  d.text('#', 40, y); d.text('Description', 64, y)
  d.text('Qty', 340, y, { align: 'right' }); d.text('Unit', 430, y, { align: 'right' }); d.text('Amount', W - 40, y, { align: 'right' })
  y += 8; d.line(40, y, W - 40, y); y += 16
  d.setFont('helvetica', 'normal')
  inv.lines.forEach((l, k) => {
    const rows = d.splitTextToSize(l.desc, 250)
    d.text(String(k + 1), 40, y); d.text(rows, 64, y)
    d.text(String(l.qty), 340, y, { align: 'right' }); d.text(rs(l.unit), 430, y, { align: 'right' }); d.text(rs(l.unit * l.qty), W - 40, y, { align: 'right' })
    y += 16 * rows.length
    if (y > 760) { d.addPage(); y = 56 }
  })
  y += 6; d.line(40, y, W - 40, y); y += 20
  const tot = (label: string, v: string, bold = false) => {
    d.setFont('helvetica', bold ? 'bold' : 'normal')
    d.text(label, 400, y, { align: 'right' }); d.text(v, W - 40, y, { align: 'right' }); y += 16
  }
  tot('Subtotal', rs(t.sub)); tot('GST (18%)', rs(t.gst)); tot('Total', rs(t.total), true)
  y += 10
  d.setFont('helvetica', 'normal').setFontSize(9).setTextColor(110)
  if (inv.status === 'Paid') d.text(`Paid via ${inv.method ?? '-'}`, 40, y)
  else d.text(`Payment due by ${inv.due}.`, 40, y)
  d.save(`invoice-${inv.number}.pdf`)
}
