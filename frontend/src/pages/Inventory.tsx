import { useMemo, useState } from 'react'
import { AlertTriangle, Boxes, PackageX, Pencil, Plus, Search, ShoppingCart } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { useStore } from '../api/store'
import { inr } from '../api/format'
import { Badge, Card, Empty, PageHeader, StatCard } from '../components/ui'

const stateOf = (stock: number, reorder: number) => (stock === 0 ? 'Out of Stock' : stock <= reorder ? 'Low Stock' : 'In Stock')

export default function Inventory() {
  const { parts, restock, saveItem, workOrders, toast } = useStore()
  const { user } = useAuth()
  const staff = user!.role !== 'TECHNICIAN'
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('All Categories')
  const [adding, setAdding] = useState<number | null>(null)
  const [qty, setQty] = useState(10)
  const [lowOnly, setLowOnly] = useState(false)
  const blank = { code: '', name: '', category: '', brand: '', stock: 0, reorder: 5, price: 0 }
  const [form, setForm] = useState<(typeof blank & { id?: number }) | null>(null)
  const [saving, setSaving] = useState(false)
  const setF = (k: keyof typeof blank, v: string | number) => setForm((f) => (f ? { ...f, [k]: v } : f))
  const submit = async () => {
    if (!form) return
    if (!form.name.trim() || !form.category.trim() || !form.brand.trim() || (!form.id && !form.code.trim())) return toast('Code, name, category and brand are required', 'warn')
    setSaving(true)
    const err = await saveItem({ ...form, code: form.code.trim(), name: form.name.trim(), category: form.category.trim(), brand: form.brand.trim() }, form.id)
    setSaving(false)
    if (err) toast(err, 'warn')
    else setForm(null)
  }
  const categories = Array.from(new Set(parts.map((p) => p.category))).sort()

  const rows = useMemo(
    () => parts.filter((p) => (cat === 'All Categories' || p.category === cat) && (!lowOnly || p.stock <= p.reorder) && (!q || `${p.name} ${p.code} ${p.brand}`.toLowerCase().includes(q.toLowerCase()))),
    [parts, q, cat, lowOnly],
  )
  const low = parts.filter((p) => p.stock > 0 && p.stock <= p.reorder).length
  const out = parts.filter((p) => p.stock === 0).length
  const pending = workOrders.filter((w) => ['Created', 'Assigned'].includes(w.status)).length

  return (
    <>
      <PageHeader title="Inventory" sub="Manage spare parts and stock levels.">
        {staff && <button className="btn p" onClick={() => setForm({ ...blank })}><Plus size={16} /> Add new item</button>}
      </PageHeader>
      {form && (
        <Card title={form.id ? `Edit ${form.code}` : 'New inventory item'}>
          <datalist id="inv-cats">{categories.map((c) => <option key={c} value={c} />)}</datalist>
          <div className="invite" style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))' }}>
            <label className="field"><span className="field-l">Item code</span><span className="inp"><input value={form.code} disabled={!!form.id} maxLength={30} onChange={(e) => setF('code', e.target.value)} /></span></label>
            <label className="field"><span className="field-l">Item name</span><span className="inp"><input value={form.name} maxLength={120} onChange={(e) => setF('name', e.target.value)} /></span></label>
            <label className="field"><span className="field-l">Category</span><span className="inp"><input list="inv-cats" value={form.category} maxLength={60} onChange={(e) => setF('category', e.target.value)} /></span></label>
            <label className="field"><span className="field-l">Brand</span><span className="inp"><input value={form.brand} maxLength={60} onChange={(e) => setF('brand', e.target.value)} /></span></label>
            <label className="field"><span className="field-l">{form.id ? 'Stock (counted quantity)' : 'Opening stock'}</span><span className="inp"><input type="number" min={0} value={form.stock} onChange={(e) => setF('stock', Math.max(0, Number(e.target.value)))} /></span></label>
            <label className="field"><span className="field-l">Reorder level</span><span className="inp"><input type="number" min={0} value={form.reorder} onChange={(e) => setF('reorder', Math.max(0, Number(e.target.value)))} /></span></label>
            <label className="field"><span className="field-l">Unit price (INR)</span><span className="inp"><input type="number" min={0} step="0.01" value={form.price} onChange={(e) => setF('price', Math.max(0, Number(e.target.value)))} /></span></label>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button className="btn p" disabled={saving} onClick={submit}>{form.id ? 'Save changes' : 'Add item'}</button>
            <button className="btn" onClick={() => setForm(null)}>Cancel</button>
          </div>
        </Card>
      )}
      <div className="stats">
        <StatCard icon={<Boxes size={22} />} tone="blue" value={parts.reduce((a, p) => a + p.stock, 0)} label="Total Items" />
        <StatCard icon={<AlertTriangle size={22} />} tone="amber" value={low} label="Low Stock" />
        <StatCard icon={<PackageX size={22} />} tone="red" value={out} label="Out of Stock" />
        <StatCard icon={<ShoppingCart size={22} />} tone="purple" value={pending} label="Jobs Awaiting Parts Check" />
      </div>
      <div className="toolbar">
        <div className="search"><Search size={16} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search items..." aria-label="Search items" /></div>
        <label className="muted" style={{ display: 'flex', gap: 6, alignItems: 'center' }}><input type="checkbox" checked={lowOnly} onChange={(e) => setLowOnly(e.target.checked)} /> Low / out of stock only</label>
        <select value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Category">
          {['All Categories', ...Array.from(new Set(parts.map((p) => p.category)))].map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>
      <Card>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead><tr><th>Item Code</th><th>Item Name</th><th>Category</th><th>Brand</th><th className="num">Stock</th><th className="num">Unit Price</th><th>Status</th>{staff && <th>Action</th>}</tr></thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id}>
                  <td><b className="id">{p.code}</b></td><td>{p.name}</td><td>{p.category}</td><td>{p.brand}</td>
                  <td className="num"><b>{p.stock}</b></td><td className="num">{inr(p.price)}</td>
                  <td><Badge>{stateOf(p.stock, p.reorder)}</Badge></td>
                  {staff && (
                    <td>
                      {adding === p.id ? (
                        <span className="row" style={{ justifyContent: 'flex-start' }}>
                          <input type="number" min={1} value={qty} onChange={(e) => setQty(Number(e.target.value))} style={{ width: 70, height: 32 }} aria-label="Quantity to add" />
                          <button className="btn p sm" onClick={() => { if (qty > 0) { restock(p.id, qty); setAdding(null) } }}>Add</button>
                          <button className="btn sm" onClick={() => setAdding(null)}>Cancel</button>
                        </span>
                      ) : (
                        <span style={{ display: 'flex', gap: 6 }}>
                          <button className="btn sm" onClick={() => { setAdding(p.id); setQty(10) }}><Plus size={14} /> Add stock</button>
                          <button className="icon-btn" aria-label={`Edit ${p.code}`} onClick={() => setForm({ id: p.id, code: p.code, name: p.name, category: p.category, brand: p.brand, stock: p.stock, reorder: p.reorder, price: p.price })}><Pencil size={15} /></button>
                        </span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && <Empty text="No items match." />}
        </div>
      </Card>
    </>
  )
}
