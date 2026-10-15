import { useMemo, useState } from 'react'
import { AlertTriangle, Boxes, PackageX, Plus, Search, ShoppingCart } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { useStore } from '../api/store'
import { inr } from '../api/format'
import { Badge, Card, Empty, PageHeader, StatCard } from '../components/ui'

const stateOf = (stock: number, reorder: number) => (stock === 0 ? 'Out of Stock' : stock <= reorder ? 'Low Stock' : 'In Stock')

export default function Inventory() {
  const { parts, restock, workOrders } = useStore()
  const { user } = useAuth()
  const staff = user!.role !== 'TECHNICIAN'
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('All Categories')
  const [adding, setAdding] = useState<number | null>(null)
  const [qty, setQty] = useState(10)

  const rows = useMemo(
    () => parts.filter((p) => (cat === 'All Categories' || p.category === cat) && (!q || `${p.name} ${p.code} ${p.brand}`.toLowerCase().includes(q.toLowerCase()))),
    [parts, q, cat],
  )
  const low = parts.filter((p) => p.stock > 0 && p.stock <= p.reorder).length
  const out = parts.filter((p) => p.stock === 0).length
  const pending = workOrders.filter((w) => ['Created', 'Assigned'].includes(w.status)).length

  return (
    <>
      <PageHeader title="Inventory" sub="Manage spare parts and stock levels." />
      <div className="stats">
        <StatCard icon={<Boxes size={22} />} tone="blue" value={parts.reduce((a, p) => a + p.stock, 0)} label="Total Items" />
        <StatCard icon={<AlertTriangle size={22} />} tone="amber" value={low} label="Low Stock" />
        <StatCard icon={<PackageX size={22} />} tone="red" value={out} label="Out of Stock" />
        <StatCard icon={<ShoppingCart size={22} />} tone="purple" value={pending} label="Jobs Awaiting Parts Check" />
      </div>
      <div className="toolbar">
        <div className="search"><Search size={16} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search items..." aria-label="Search items" /></div>
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
                      ) : <button className="btn sm" onClick={() => { setAdding(p.id); setQty(10) }}><Plus size={14} /> Add stock</button>}
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
