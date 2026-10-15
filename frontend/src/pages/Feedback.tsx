import { useStore } from '../api/store'
import { fmtDate } from '../api/format'
import { Avatar, Card, Empty, PageHeader, Stars } from '../components/ui'
import { useScoped } from './scope'

export default function Feedback() {
  const { customers } = useStore()
  const { workOrders } = useScoped()
  const rows = workOrders.filter((w) => w.rating).sort((a, b) => b.rating!.at.localeCompare(a.rating!.at))
  const avg = rows.length ? rows.reduce((a, w) => a + w.rating!.stars, 0) / rows.length : 0
  return (
    <>
      <PageHeader title="Customer Feedback" sub="View and manage customer feedback and ratings." />
      <Card title={rows.length ? <span>Average rating {avg.toFixed(1)} <Stars value={avg} size={15} /> ({rows.length} reviews)</span> : 'Reviews'}>
        {rows.map((w) => {
          const c = customers.find((x) => x.id === w.customerId)!
          return (
            <div key={w.id} className="fb">
              <Avatar name={c.name} size={44} />
              <div style={{ flex: 1 }}>
                <b>{c.name}</b> <small className="muted">{w.serviceType} · {w.code}</small>
                <div><Stars value={w.rating!.stars} size={14} /></div>
                <p style={{ marginTop: 4 }}>{w.rating!.comment}</p>
              </div>
              <small className="muted">{fmtDate(w.rating!.at)}</small>
            </div>
          )
        })}
        {!rows.length && <Empty text="No feedback yet." />}
      </Card>
    </>
  )
}
