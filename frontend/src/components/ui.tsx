import { ReactNode } from 'react'
import { Star } from 'lucide-react'

const PALETTE = ['#2e3192', '#6a4c93', '#2f7d4f', '#c0521f', '#a23b72', '#6c72d9', '#1c1d4a', '#2b8a9e']
export const initials = (n: string) => n.replace(/\./g, '').split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase()
export const colorFor = (n: string) => PALETTE[[...n].reduce((a, c) => a + c.charCodeAt(0), 0) % PALETTE.length]

export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.38, background: colorFor(name) }} aria-hidden="true">
      {initials(name)}
    </span>
  )
}

const TONES: Record<string, string> = {
  High: 'red', Medium: 'amber', Low: 'green',
  New: 'blue', Scheduled: 'blue', 'In Progress': 'purple', Completed: 'green', Cancelled: 'gray',
  Created: 'blue', Assigned: 'blue', 'En Route': 'purple',
  Paid: 'green', Pending: 'amber', Overdue: 'red',
  Available: 'green', 'On Duty': 'amber', 'On Leave': 'red',
  'In Stock': 'green', 'Low Stock': 'amber', 'Out of Stock': 'red',
}
export function Badge({ children, tone }: { children: string; tone?: string }) {
  return <span className={`badge ${tone ?? TONES[children] ?? 'gray'}`}>{children}</span>
}

export function Card({ title, action, children, className = '' }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`card ${className}`}>
      {(title || action) && (
        <header className="card-h">
          <h3>{title}</h3>
          {action}
        </header>
      )}
      {children}
    </section>
  )
}

export function StatCard({ icon, tone, value, label, delta }: { icon: ReactNode; tone: string; value: ReactNode; label: string; delta?: { text: string; up: boolean } }) {
  return (
    <div className="stat">
      <span className={`stat-i ${tone}`}>{icon}</span>
      <div>
        <div className="stat-v">{value}</div>
        <div className="stat-l">{label}</div>
        {delta && <div className={`stat-d ${delta.up ? 'up' : 'down'}`}>{delta.up ? '▲' : '▼'} {delta.text}</div>}
      </div>
    </div>
  )
}

export function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <span className="stars" aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={size} fill={n <= Math.round(value) ? '#e8a317' : 'none'} color={n <= Math.round(value) ? '#e8a317' : '#c9cbe0'} />
      ))}
    </span>
  )
}

export function Field({ label, error, required, children }: { label: string; error?: string; required?: boolean; children: ReactNode }) {
  return (
    <label className="field">
      <span className="field-l">{label}{required && <b className="req"> *</b>}</span>
      {children}
      {error && <span className="field-e">{error}</span>}
    </label>
  )
}

export function PageHeader({ title, sub, children }: { title: ReactNode; sub?: string; children?: ReactNode }) {
  return (
    <div className="page-h">
      <div>
        <h1>{title}</h1>
        {sub && <p>{sub}</p>}
      </div>
      <div className="page-h-a">{children}</div>
    </div>
  )
}

export function Empty({ text }: { text: string }) {
  return <div className="empty">{text}</div>
}
