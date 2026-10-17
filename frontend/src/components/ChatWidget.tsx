import { useRef, useState } from 'react'
import { Bot, Send, X } from 'lucide-react'
import { useScoped } from '../pages/scope'
import { aiMessage, aiRun } from '../api/ai'

interface Msg { from: 'me' | 'ai'; text: string }

/** Customer-only helper: answers questions about the customer's own requests (their data only is sent). */
export default function ChatWidget() {
  const { requests, workOrders } = useScoped()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const [msgs, setMsgs] = useState<Msg[]>([{ from: 'ai', text: 'Hi! Ask me about your service requests, e.g. "What is the status of my AC request?"' }])
  const end = useRef<HTMLDivElement>(null)

  const send = async (e: React.FormEvent) => {
    e.preventDefault()
    const text = q.trim()
    if (!text || busy) return
    setQ(''); setBusy(true)
    setMsgs((m) => [...m, { from: 'me', text }])
    try {
      const data = requests.slice(0, 15).map((r) => {
        const w = workOrders.find((x) => x.id === r.workOrderId)
        return { code: r.code, issue: r.issueType, priority: r.priority, requestStatus: r.status, created: r.createdOn, workOrderStatus: w?.status, visitDate: w?.date, startHour: w?.startHour }
      })
      const ans = await aiRun('CHAT', JSON.stringify({ question: text, myRequests: data }))
      setMsgs((m) => [...m, { from: 'ai', text: ans }])
    } catch (ex) {
      setMsgs((m) => [...m, { from: 'ai', text: aiMessage(ex) }])
    } finally {
      setBusy(false)
      setTimeout(() => end.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    }
  }

  return (
    <>
      <button type="button" className="chat-fab" aria-label="Ask the assistant" onClick={() => setOpen((v) => !v)}>
        {open ? <X size={22} /> : <Bot size={22} />}
      </button>
      {open && (
        <div className="chat-box" role="dialog" aria-label="Assistant">
          <div className="chat-h"><Bot size={18} /> ServicePro assistant</div>
          <div className="chat-b">
            {msgs.map((m, i) => <p key={i} className={`chat-m ${m.from}`}>{m.text}</p>)}
            {busy && <p className="chat-m ai">Thinking…</p>}
            <div ref={end} />
          </div>
          <form className="chat-f" onSubmit={send}>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ask about your request…" maxLength={300} aria-label="Your question" />
            <button type="submit" disabled={busy || !q.trim()} aria-label="Send"><Send size={16} /></button>
          </form>
        </div>
      )}
    </>
  )
}
