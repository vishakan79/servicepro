import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Bot, ClipboardList, FileText, LayoutDashboard, MessageSquare, Package, Send, Sparkles, Users, Wand2, Wrench } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { useStore } from '../api/store'
import { aiMessage, aiRun } from '../api/ai'
import { Card, PageHeader } from '../components/ui'
import { useScoped } from './scope'
import { Role } from '../types'

interface Feature { icon: typeof Bot; title: string; text: string; to?: string; cta?: string }

const FEATURES: Record<Role, Feature[]> = {
  ADMIN: [
    { icon: LayoutDashboard, title: 'Business summary', text: 'A plain-language read of your dashboard: highlights, risks and what to do next.', to: '/dashboard', cta: 'Open dashboard' },
    { icon: Users, title: 'Smart technician assignment', text: 'Ranks technicians by skill, rating, leave and workload that day, with a one-line reason.', to: '/work-orders', cta: 'Open work orders' },
    { icon: Wand2, title: 'Request triage', text: 'Suggests the issue type and priority from the customer’s description.', to: '/requests/new', cta: 'New request' },
    { icon: ClipboardList, title: 'Job notes summary', text: 'Turns rough technician notes into a clean summary the customer can read.', to: '/work-orders', cta: 'Open work orders' },
  ],
  MANAGER: [
    { icon: LayoutDashboard, title: 'Business summary', text: 'A plain-language read of the dashboard: highlights, risks and next actions.', to: '/dashboard', cta: 'Open dashboard' },
    { icon: Users, title: 'Smart technician assignment', text: 'Ranks technicians by skill, rating, leave and workload that day.', to: '/work-orders', cta: 'Open work orders' },
    { icon: Wand2, title: 'Request triage', text: 'Suggests the issue type and priority from the description.', to: '/requests/new', cta: 'New request' },
    { icon: ClipboardList, title: 'Job notes summary', text: 'Turns rough technician notes into a clean customer-ready summary.', to: '/work-orders', cta: 'Open work orders' },
  ],
  TECHNICIAN: [
    { icon: Wrench, title: 'Troubleshooting help', text: 'Safe step-by-step checks for the fault on your job. Open a job and tap “AI help”.', to: '/my-jobs', cta: 'Open my jobs' },
    { icon: ClipboardList, title: 'Notes summary', text: 'Write rough notes on site; AI cleans them into a short report for the customer.', to: '/my-jobs', cta: 'Open my jobs' },
  ],
  CUSTOMER: [
    { icon: Wand2, title: 'Describe the problem, we pick the type', text: 'Write what is wrong; AI suggests the service type and priority for your request.', to: '/requests/new', cta: 'New request' },
    { icon: MessageSquare, title: 'Chat about your requests', text: 'Use the chat bubble at the bottom-right to ask about the status of your own requests.' },
  ],
  INVENTORY_MANAGER: [
    { icon: Package, title: 'Reorder advice', text: 'Ask what to reorder first, based on stock against reorder level.', to: '/inventory', cta: 'Open inventory' },
    { icon: FileText, title: 'Stock questions', text: 'Ask about low or out-of-stock items, categories and prices in plain language.' },
  ],
}

const PROMPTS: Record<Role, string[]> = {
  ADMIN: ['Summarise how the business is doing today', 'Which risks need attention first?', 'How do I add a new technician?'],
  MANAGER: ['What should I focus on today?', 'Which jobs are at risk of missing SLA?', 'Which spare parts are running low?'],
  TECHNICIAN: ['AC is not cooling: what should I check?', 'Water is leaking from the indoor unit. Steps?', 'How do I record parts used on a job?'],
  CUSTOMER: ['How do I raise a service request?', 'What does “En Route” mean?', 'How can I pay my invoice?'],
  INVENTORY_MANAGER: ['What should I reorder first?', 'List items that are out of stock', 'Which category has the most low stock?'],
}

const ROLE_NAME: Record<Role, string> = { ADMIN: 'Administrator', MANAGER: 'Manager', TECHNICIAN: 'Technician', CUSTOMER: 'Customer', INVENTORY_MANAGER: 'Inventory Manager' }

interface Msg { from: 'me' | 'ai'; text: string }

export default function AiHub() {
  const { user } = useAuth()
  const role = user!.role
  const { parts } = useStore()
  const { workOrders, requests, invoices } = useScoped()
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const [msgs, setMsgs] = useState<Msg[]>([{ from: 'ai', text: `Hi ${user!.name.split(' ')[0]}! I can answer questions about your work in ServicePro. Pick a suggestion or type your own.` }])
  const end = useRef<HTMLDivElement>(null)
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }) }, [msgs])

  /** Only the figures this role may see, kept short (the server limit is 6000 characters). */
  const context = useMemo(() => {
    const low = parts.filter((p) => p.stock <= p.reorder).sort((a, b) => a.stock - b.stock)
    const stock = { totalItems: parts.length, outOfStock: parts.filter((p) => p.stock === 0).length, lowStock: low.filter((p) => p.stock > 0).length,
      lowItems: low.slice(0, 20).map((p) => `${p.code} ${p.name} (${p.category}) stock ${p.stock}/reorder ${p.reorder}`) }
    const byStatus = workOrders.reduce<Record<string, number>>((a, w) => ({ ...a, [w.status]: (a[w.status] ?? 0) + 1 }), {})
    if (role === 'INVENTORY_MANAGER') return { stock }
    if (role === 'CUSTOMER') return { myRequests: requests.slice(0, 10).map((r) => ({ code: r.code, issue: r.issueType, status: r.status })), myOrders: byStatus }
    if (role === 'TECHNICIAN') return { myJobs: workOrders.filter((w) => w.status !== 'Completed' && w.status !== 'Cancelled').slice(0, 8).map((w) => ({ type: w.serviceType, status: w.status, date: w.date, issue: w.description.slice(0, 120) })) }
    return { workOrdersByStatus: byStatus, slaBreached: workOrders.filter((w) => w.slaBreached).length, unpaidInvoices: invoices.filter((i) => i.status !== 'Paid').length, stock: { ...stock, lowItems: stock.lowItems.slice(0, 8) } }
  }, [parts, workOrders, requests, invoices, role])

  const ask = async (text: string) => {
    const question = text.trim()
    if (!question || busy) return
    setQ(''); setBusy(true)
    setMsgs((m) => [...m, { from: 'me', text: question }])
    try {
      const ans = await aiRun('ROLE_ASSIST', { role, question, context })
      setMsgs((m) => [...m, { from: 'ai', text: ans }])
    } catch (e) { setMsgs((m) => [...m, { from: 'ai', text: aiMessage(e) }]) } finally { setBusy(false) }
  }

  return (
    <>
      <PageHeader title="AI Assistant" sub={`What AI can do for you as ${ROLE_NAME[role]}.`} />
      <div className="aihub">
        <div className="ai-feats">
          {FEATURES[role].map((f) => (
            <article key={f.title} className="ai-feat">
              <span className="ai-ic"><f.icon size={20} /></span>
              <div>
                <h3>{f.title}</h3>
                <p>{f.text}</p>
                {f.to && <Link to={f.to} className="ai-go">{f.cta} <ArrowRight size={14} /></Link>}
              </div>
            </article>
          ))}
          <p className="ai-note"><Sparkles size={14} /> AI answers are suggestions. Check them before acting, especially for electrical, gas and safety work.</p>
        </div>
        <Card title={<><Bot size={17} style={{ verticalAlign: '-3px' }} /> Ask the assistant</>}>
          <div className="ai-chat">
            <div className="ai-msgs" aria-live="polite">
              {msgs.map((m, i) => <p key={i} className={`chat-m ${m.from}`}>{m.text}</p>)}
              {busy && <p className="chat-m ai">Thinking…</p>}
              <div ref={end} />
            </div>
            <div className="ai-prompts">
              {PROMPTS[role].map((p) => <button key={p} type="button" className="chip" disabled={busy} onClick={() => void ask(p)}>{p}</button>)}
            </div>
            <form className="chat-f" onSubmit={(e) => { e.preventDefault(); void ask(q) }}>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ask in English, Tamil, Hindi…" maxLength={300} aria-label="Your question" />
              <button type="submit" disabled={busy || !q.trim()} aria-label="Send"><Send size={16} /></button>
            </form>
          </div>
        </Card>
      </div>
    </>
  )
}
