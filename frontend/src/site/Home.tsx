import { FormEvent, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Check, ChevronDown, LogIn, Menu, Plus, Sparkles, X } from 'lucide-react'
import { Count, Rv, ScrollProgress, Tilt, Words, useReveal } from './motion'
import { Logo } from '../components/Layout'
import { useAuth } from '../auth/AuthContext'
import { ApiError, submitInquiry } from '../api/inquiry'
import { AI_FEATURES, AI_ROLE_NOTE, FAQ, INTERESTS, PLATFORM, ROLES, SOLUTIONS, STEPS, TOUR, TRUST, USE_CASES } from './content'
import './site.css'

const go = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' })

const NAV = [
  { id: 'usecases', label: 'Use cases' },
  { id: 'ai', label: 'AI assistant' },
  { id: 'how', label: 'How it works' },
  { id: 'roles', label: 'Roles' },
  { id: 'platform', label: 'Platform' },
  { id: 'faq', label: 'FAQ' },
]

function SiteHeader() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [mega, setMega] = useState(false)
  const ref = useRef<HTMLElement>(null)
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => { const f = () => setScrolled(window.scrollY > 8); f(); addEventListener('scroll', f, { passive: true }); return () => removeEventListener('scroll', f) }, [])
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setMega(false) }
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') { setMega(false); setOpen(false) } }
    document.addEventListener('mousedown', h); document.addEventListener('keydown', k)
    return () => { document.removeEventListener('mousedown', h); document.removeEventListener('keydown', k) }
  }, [])
  useEffect(() => { document.body.style.overflow = open ? 'hidden' : ''; return () => { document.body.style.overflow = '' } }, [open])
  const jump = (id: string) => { setOpen(false); setMega(false); setTimeout(() => go(id), open ? 250 : 0) }

  return (
    <header className={`hdr ${scrolled ? 'scrolled' : ''}`} ref={ref}>
      <div className="wrap hdr-in">
        <button className="hdr-logo plain" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="ServicePro, back to top"><Logo /></button>
        <nav className="menu" aria-label="Main">
          <div className="rel">
            <button className={`m-link ${mega ? 'on' : ''}`} onClick={() => setMega(!mega)} aria-expanded={mega} aria-haspopup="true">
              Solutions <ChevronDown size={14} />
            </button>
            {mega && (
              <div className="mega" role="menu">
                {SOLUTIONS.map((s) => (
                  <button key={s.id} className="mega-i" role="menuitem" onClick={() => jump('solutions')}>
                    <span className="mega-ic"><s.icon size={18} /></span>
                    <span><b>{s.title}</b><small>{s.text.split('.')[0]}.</small></span>
                  </button>
                ))}
              </div>
            )}
          </div>
          {NAV.map((n) => <button key={n.id} className="m-link" onClick={() => jump(n.id)}>{n.label}</button>)}
        </nav>
        <div className="hdr-r">
          <Link to={user ? '/dashboard' : '/login'} className="btn sm-hide"><LogIn size={16} /> {user ? 'Open app' : 'Sign in'}</Link>
          <button className="btn p cta gl-shine" onClick={() => jump('demo')}>Request a demo</button>
        </div>
        <button className="icon-btn burger" onClick={() => setOpen(true)} aria-label="Open menu" aria-expanded={open}><Menu size={22} /></button>
      </div>

      {open && <div className="scrim" onClick={() => setOpen(false)} />}
      <aside className={`drawer ${open ? 'open' : ''}`} aria-hidden={!open} aria-label="Menu">
        <div className="drawer-top">
          <Logo />
          <button className="icon-btn" onClick={() => setOpen(false)} aria-label="Close menu"><X size={20} /></button>
        </div>
        <nav>
          <button className="d-link plain" onClick={() => jump('solutions')}>Solutions</button>
          {NAV.map((n) => <button key={n.id} className="d-link plain" onClick={() => jump(n.id)}>{n.label}</button>)}
        </nav>
        <div className="drawer-foot">
          <Link to={user ? '/dashboard' : '/login'} className="btn big"><LogIn size={16} /> {user ? 'Open app' : 'Sign in'}</Link>
          <button className="btn p big" onClick={() => jump('demo')}>Request a demo</button>
        </div>
      </aside>
    </header>
  )
}

/** Decorative dot grid with a few softly pulsing network nodes. */
function NetArt() {
  const nodes: [number, number][] = [[90, 120], [210, 60], [330, 170], [470, 90], [610, 190], [720, 70], [160, 300], [300, 380], [450, 300], [600, 420], [740, 330], [60, 450]]
  const links: [number, number][] = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [2, 8], [6, 7], [7, 8], [8, 9], [9, 10], [4, 10], [0, 6], [6, 11]]
  return (
    <svg className="gl-net" viewBox="0 0 800 500" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <defs><pattern id="gl-dots" width="28" height="28" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.3" fill="rgba(255,255,255,.22)" /></pattern></defs>
      <rect width="800" height="500" fill="url(#gl-dots)" />
      {links.map(([a, b], k) => <line key={k} x1={nodes[a][0]} y1={nodes[a][1]} x2={nodes[b][0]} y2={nodes[b][1]} stroke="rgba(160,190,255,.22)" strokeWidth="1" />)}
      {nodes.map(([x, y], k) => <circle key={k} className="gl-node" cx={x} cy={y} r="3.2" style={{ animationDelay: `${(k % 6) * 0.5}s` }} />)}
    </svg>
  )
}

function Hero() {
  return (
    <section className="hero-s">
      <div className="gl-mesh" aria-hidden="true" />
      <i className="blob b1" /><i className="blob b2" />
      <i className="gl-orb o1" aria-hidden="true" /><i className="gl-orb o2" aria-hidden="true" /><i className="gl-orb o3" aria-hidden="true" />
      <NetArt />
      <div className="wrap hero-grid">
        <div className="hero-copy">
          <p className="kicker pop" style={{ ['--d' as string]: '0ms' }}>Field service management</p>
          <h1><Words parts={[{ t: 'Every field job, from the first call to the' }, { t: 'paid invoice.', hl: true }]} /></h1>
          <p className="lead pop" style={{ ['--d' as string]: '260ms' }}>ServicePro gives your control desk, technicians and customers one shared view of each job: who is going, what is done, which parts were used and what is owed.</p>
          <div className="hero-cta pop" style={{ ['--d' as string]: '400ms' }}>
            <button className="btn p big cta-pulse gl-shine" onClick={() => go('demo')}>Request a demo <ArrowRight size={18} /></button>
            <button className="btn big ghost" onClick={() => go('usecases')}>See use cases</button>
          </div>
        </div>
        <div className="hero-art pop" style={{ ['--d' as string]: '300ms' }}>
          <Tilt>
          <div className="frame float"><i /><i /><i /><img className="vid" src="/shots/dashboard.jpg" alt="ServicePro dashboard" width="1360" height="850" /></div>
          <div className="phone float2" aria-hidden="true"><img src="/shots/mobile.jpg" alt="" width="780" height="1560" /></div>
          <div className="chip-f c1" aria-hidden="true"><Check size={14} /> Technician assigned</div>
          <div className="chip-f c2" aria-hidden="true"><i /> Live: on the way</div>
          </Tilt>
        </div>
      </div>
      <div className="wrap facts">
        {([[5, '', 'roles, each with its own view'], [6, '', 'AI helpers built in'], [14, '', 'languages, incl. Hindi and Tamil'], [6, '', 'stages from request to payment']] as [number, string, string][]).map(([v, u, l]) => (
          <div key={l}><b><Count to={v} suffix={u} /></b><span>{l}</span></div>
        ))}
      </div>
      <div className="marq" aria-hidden="true">
        <div>{[...SOLUTIONS, ...SOLUTIONS, ...SOLUTIONS].map((x, k) => <span key={k}><x.icon size={16} /> {x.title}</span>)}</div>
      </div>
    </section>
  )
}

const Head = ({ kicker, title, text }: { kicker?: string; title: string; text?: string }) => (
  <div className="sec-h rv">
    {kicker && <p className="kicker dark">{kicker}</p>}
    <h2>{title}</h2>
    {text && <p>{text}</p>}
  </div>
)

function Solutions() {
  return (
    <section id="solutions" className="sec">
      <div className="wrap">
        <Head kicker="What it covers" title="Everything a service desk touches in a day" text="Six modules that share one record for each customer and each job, so nothing is typed twice." />
        <div className="grid3">
          {SOLUTIONS.map((s) => (
            <article key={s.id} className="svc rv" style={{ ['--d' as string]: `${(SOLUTIONS.indexOf(s) % 3) * 90}ms` }}>
              <span className="svc-ic"><s.icon size={22} /></span>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function UseCases() {
  return (
    <section id="usecases" className="sec alt">
      <div className="wrap">
        <Head kicker="Real-world use cases" title="Built for the businesses that send technicians to the customer" text="Whatever you repair, the day looks the same: a call, a visit, parts, a bill. ServicePro keeps that chain in one place." />
        <div className="grid3">
          {USE_CASES.map((u, k) => (
            <article key={u.title} className="svc rv" style={{ ['--d' as string]: `${(k % 3) * 90}ms` }}>
              <span className="svc-ic"><u.icon size={22} /></span>
              <h3>{u.title}</h3>
              <p>{u.flow}</p>
              <p className="uc-who"><b>Good fit:</b> {u.who}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function AiSection() {
  return (
    <section id="ai" className="sec">
      <div className="wrap">
        <Head kicker="AI built in" title="An assistant for every role, not a gimmick" text="Each person gets the AI that fits their work, from the top bar. It suggests; your people decide." />
        <div className="grid3">
          {AI_FEATURES.map((f, k) => (
            <article key={f.title} className="svc rv" style={{ ['--d' as string]: `${(k % 3) * 90}ms` }}>
              <span className="svc-ic ai"><f.icon size={22} /></span>
              <h3>{f.title}</h3>
              <p>{f.text}</p>
            </article>
          ))}
        </div>
        <p className="ai-foot rv"><Sparkles size={16} /> {AI_ROLE_NOTE}</p>
      </div>
    </section>
  )
}

function Tour() {
  const [i, setI] = useState(0)
  const [paused, setPaused] = useState(false)
  const t = TOUR[i]
  useEffect(() => { if (paused || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return; const h = setTimeout(() => setI((i + 1) % TOUR.length), 5500); return () => clearTimeout(h) }, [i, paused])
  return (
    <section id="tour" className="sec alt">
      <div className="wrap">
        <Head kicker="The product" title="The real screens, not a mock-up" />
        <div className="tour" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)}>
          <div className="tour-tabs" role="tablist" aria-label="Product screens">
            {TOUR.map((x, k) => (
              <button key={x.id} role="tab" aria-selected={k === i} className={`tour-tab ${k === i ? 'on' : ''}`} onClick={() => setI(k)}>
                {k === i && !paused && <u className="prog" key={i} />}
                <b>{x.label}</b>
                <span>{x.text}</span>
              </button>
            ))}
          </div>
          <div className="tour-view" role="tabpanel">
            <div className="frame"><i /><i /><i /><img key={t.id} className="swap" src={t.img} alt={t.title} width="1360" height="850" loading="lazy" /></div>
          </div>
        </div>
      </div>
    </section>
  )
}

function How() {
  return (
    <section id="how" className="sec">
      <div className="wrap">
        <Head kicker="How it works" title="One job, six stages" text="The order is fixed on purpose: a job cannot be closed before its checklist is done, and an invalid status change is refused." />
        <ol className="steps">
          {STEPS.map((s, k) => (
            <li key={s.title} className="rv" style={{ ['--d' as string]: `${(STEPS.indexOf(s) % 3) * 90}ms` }}>
              <span className="step-n">{k + 1}</span>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

function Roles() {
  return (
    <section id="roles" className="sec dark">
      <div className="wrap">
        <Head title="One system, five different views" text="People see what their role needs, enforced by the server rather than hidden by the screen." />
        <div className="grid4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))' }}>
          {ROLES.map((r) => (
            <article key={r.name} className="role rv" style={{ ['--d' as string]: `${ROLES.indexOf(r) * 90}ms` }}>
              <r.icon size={26} />
              <h3>{r.name}</h3>
              <p>{r.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function Platform() {
  return (
    <section id="platform" className="sec">
      <div className="wrap">
        <Head kicker="Platform" title="Built on a stack your team already hires for" />
        <div className="grid4 stack">
          {PLATFORM.map((g) => (
            <div key={g.group} className="stack-g rv">
              <h3>{g.group}</h3>
              <ul>{g.items.map((x) => <li key={x}><Check size={15} /> {x}</li>)}</ul>
            </div>
          ))}
        </div>
        <div className="grid4 trust">
          {TRUST.map((t) => (
            <article key={t.title} className="rv">
              <t.icon size={22} />
              <h3>{t.title}</h3>
              <p>{t.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function Faq() {
  return (
    <section id="faq" className="sec alt">
      <div className="wrap narrow">
        <Head title="Questions teams ask first" />
        <div className="faq">
          {FAQ.map((f) => (
            <details key={f.q} className="rv">
              <summary>{f.q}<Plus size={18} /></summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}

function Demo() {
  const empty = { name: '', email: '', company: '', phone: '', interest: INTERESTS[0], message: '', website: '' }
  const [f, setF] = useState(empty)
  const [errs, setErrs] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const set = (k: keyof typeof empty) => (e: { target: { value: string } }) => { setF({ ...f, [k]: e.target.value }); setErrs({ ...errs, [k]: '' }) }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const er: Record<string, string> = {}
    if (!f.name.trim()) er.name = 'Enter your name'
    if (!/^\S+@\S+\.\S+$/.test(f.email.trim())) er.email = 'Enter a valid email address'
    if (f.phone.trim() && !/^[+0-9 ()-]{7,30}$/.test(f.phone.trim())) er.phone = 'Enter a valid phone number'
    if (f.message.trim().length < 10) er.message = 'Tell us a little more (at least 10 characters)'
    setErrs(er)
    if (Object.keys(er).length) return
    setBusy(true)
    try {
      await submitInquiry({ ...f, name: f.name.trim(), email: f.email.trim(), message: f.message.trim() })
      setDone(true); setF(empty)
    } catch (ex) {
      const fe = ex instanceof ApiError ? ex.fieldErrors : undefined
      setErrs(fe ? { ...fe, form: 'Check the highlighted fields.' } : { form: ex instanceof Error ? ex.message : 'Could not send your request. Try again.' })
    } finally { setBusy(false) }
  }

  return (
    <section id="demo" className="sec cta-s">
      <div className="wrap demo">
        <div className="demo-copy rv">
          <h2>See it with your own jobs</h2>
          <p>Tell us how your team works today. We will walk through the product with a sample of your requests and reply within one working day.</p>
          <ul>
            <li><Check size={18} /> A 30-minute walkthrough, no commitment</li>
            <li><Check size={18} /> We use your job types, not generic examples</li>
            <li><Check size={18} /> Already registered? <Link to="/login">Sign in</Link></li>
          </ul>
        </div>
        <form className="demo-form rv" onSubmit={submit} noValidate>
          {done ? (
            <div className="sent" role="status">
              <span><Check size={28} /></span>
              <h3>Request received</h3>
              <p>Thank you. We will email you within one working day.</p>
              <button type="button" className="btn" onClick={() => setDone(false)}>Send another</button>
            </div>
          ) : (
            <>
              <div className="row2">
                <label className="fld">Name<input type="text" autoComplete="name" value={f.name} onChange={set('name')} aria-invalid={!!errs.name} className={errs.name ? 'bad' : ''} />{errs.name && <em>{errs.name}</em>}</label>
                <label className="fld">Work email<input type="email" autoComplete="email" value={f.email} onChange={set('email')} aria-invalid={!!errs.email} className={errs.email ? 'bad' : ''} />{errs.email && <em>{errs.email}</em>}</label>
              </div>
              <div className="row2">
                <label className="fld">Company<input type="text" autoComplete="organization" value={f.company} onChange={set('company')} /></label>
                <label className="fld">Phone (optional)<input type="tel" autoComplete="tel" value={f.phone} onChange={set('phone')} className={errs.phone ? 'bad' : ''} />{errs.phone && <em>{errs.phone}</em>}</label>
              </div>
              <label className="fld">What do you want to see first?
                <select value={f.interest} onChange={set('interest')}>{INTERESTS.map((x) => <option key={x}>{x}</option>)}</select>
              </label>
              <label className="fld">Your team and what you need<textarea rows={4} value={f.message} onChange={set('message')} className={errs.message ? 'bad' : ''} />{errs.message && <em>{errs.message}</em>}</label>
              <input className="hp" tabIndex={-1} autoComplete="off" aria-hidden="true" value={f.website} onChange={set('website')} name="website" />
              {errs.form && <div className="err" role="alert">{errs.form}</div>}
              <button type="submit" className="btn p big" disabled={busy}>{busy ? 'Sending…' : 'Request a demo'}</button>
            </>
          )}
        </form>
      </div>
    </section>
  )
}

function SiteFooter() {
  const { user } = useAuth()
  return (
    <footer className="ftr">
      <div className="wrap ftr-in">
        <div className="ftr-brand">
          <Logo dark />
          <p>Field service operations in one place: requests, dispatch, parts, invoices and customer feedback.</p>
        </div>
        <div>
          <h4>Solutions</h4>
          {SOLUTIONS.slice(0, 4).map((s) => <button key={s.id} onClick={() => go('solutions')}>{s.title}</button>)}
        </div>
        <div>
          <h4>Company</h4>
          <button onClick={() => go('how')}>How it works</button>
          <button onClick={() => go('platform')}>Platform</button>
          <button onClick={() => go('faq')}>FAQ</button>
        </div>
        <div>
          <h4>Get started</h4>
          <button onClick={() => go('demo')}>Request a demo</button>
          <Link to={user ? '/dashboard' : '/login'}>{user ? 'Open app' : 'Sign in'}</Link>
        </div>
      </div>
      <div className="wrap ftr-base">© {new Date().getFullYear()} ServicePro · Field service management for businesses across India</div>
    </footer>
  )
}

export default function Home() {
  useReveal()
  useEffect(() => { document.title = 'ServicePro: field service management for service teams' }, [])
  return (
    <div className="site">
      <ScrollProgress />
      <SiteHeader />
      <main>
        <Hero />
        <Solutions />
        <UseCases />
        <AiSection />
        <Tour />
        <How />
        <Roles />
        <Platform />
        <Faq />
        <Demo />
      </main>
      <SiteFooter />
    </div>
  )
}
