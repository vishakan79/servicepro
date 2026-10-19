import { Fragment, type ReactNode } from 'react'

/** Renders the small subset of Markdown the assistant uses (**bold**, "- " and "1. " lists, line breaks) without ever injecting HTML. */
function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') && part.length > 4 ? <strong key={i}>{part.slice(2, -2)}</strong> : <Fragment key={i}>{part}</Fragment>)
}

export default function AiText({ text }: { text: string }) {
  const lines = text.replace(/\r/g, '').split('\n')
  const out: ReactNode[] = []
  let list: { ordered: boolean; items: string[] } | null = null
  const flush = () => {
    if (!list) return
    const L = list
    out.push(L.ordered
      ? <ol key={out.length} className="ai-list">{L.items.map((t, i) => <li key={i}>{inline(t)}</li>)}</ol>
      : <ul key={out.length} className="ai-list">{L.items.map((t, i) => <li key={i}>{inline(t)}</li>)}</ul>)
    list = null
  }
  for (const raw of lines) {
    const line = raw.trim()
    const bullet = /^[-*•]\s+(.*)$/.exec(line)
    const num = /^\d+[.)]\s+(.*)$/.exec(line)
    if (bullet || num) {
      const ordered = !!num
      if (list && list.ordered !== ordered) flush()
      if (!list) list = { ordered, items: [] }
      list.items.push((bullet ?? num)![1])
    } else {
      flush()
      if (line) out.push(<p key={out.length} className="ai-p">{inline(line.replace(/^#+\s*/, ''))}</p>)
    }
  }
  flush()
  return <div className="ai-text">{out}</div>
}
