import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Bell, BarChart3, CalendarDays, CheckCircle2, ClipboardList, Eye, EyeOff, FileText, Globe, KeyRound, Lock, Mail, MapPin, Package, Phone, Settings, ShieldCheck, Users, UserPlus, LogIn } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { Logo } from '../components/Layout'
import * as http from '../api/http'
import { completeEmailLink, isEmailLink, rememberedEmail, sendEmailLink } from '../auth/firebase'

const features = [
  { icon: FileText, label: 'Service Requests' },
  { icon: ClipboardList, label: 'Work Order Management' },
  { icon: CalendarDays, label: 'Scheduling & Appointments' },
  { icon: Users, label: 'Technician Management' },
  { icon: Package, label: 'Spare Parts Inventory' },
  { icon: FileText, label: 'Invoicing & Payments' },
  { icon: BarChart3, label: 'Reports & Analytics' },
  { icon: Bell, label: 'Notifications & Alerts' },
  { icon: Settings, label: 'SLA Tracking & Compliance' },
]

const COUNTRIES = [['+91', 'India +91'], ['+1', 'US/Canada +1'], ['+44', 'UK +44'], ['+971', 'UAE +971'], ['+65', 'Singapore +65'], ['+61', 'Australia +61']]
const ROLES: [string, string][] = [['CUSTOMER', 'Customer'], ['TECHNICIAN', 'Technician (needs admin approval)'], ['MANAGER', 'Manager (needs admin approval)']]
const RESEND_SECONDS = 60
const DRAFT_KEY = 'sp.regdraft'
const TOKEN_KEY = 'sp.emailIdToken'
const PASSWORD_OK = /^(?=.*[A-Za-z])(?=.*[0-9]).{8,72}$/
const EMAIL_OK = /^\S+@\S+\.\S+$/

const toE164 = (dial: string, national: string) => dial + national.replace(/\D/g, '').replace(/^0+/, '')
const errText = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong. Try again.')

interface Draft { name: string; email: string; dial: string; mobile: string; role: string; address: string }
const loadDraft = (): Draft | null => { try { const d = localStorage.getItem(DRAFT_KEY); return d ? (JSON.parse(d) as Draft) : null } catch { return null } }
const saveDraft = (d: Draft) => { try { localStorage.setItem(DRAFT_KEY, JSON.stringify(d)) } catch { /* private mode */ } }
const clearDraft = () => { try { localStorage.removeItem(DRAFT_KEY); sessionStorage.removeItem(TOKEN_KEY) } catch { /* ignore */ } }

/** 6-digit SMS code box. */
function CodeInput({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return (
    <label className="field">
      <span className="field-l">{label}</span>
      <span className="inp"><KeyRound size={17} />
        <input className="otp" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="••••••" value={value}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))} />
      </span>
    </label>
  )
}

export function PasswordInput({ label, value, onChange, auto, hint }: { label: string; value: string; onChange: (v: string) => void; auto: string; hint?: string }) {
  const [show, setShow] = useState(false)
  return (
    <label className="field">
      <span className="field-l">{label}</span>
      <span className="inp"><Lock size={17} />
        <input type={show ? 'text' : 'password'} autoComplete={auto} maxLength={72} placeholder={hint ?? 'Password'} value={value} onChange={(e) => onChange(e.target.value)} />
        <button type="button" className="eye" aria-label={show ? 'Hide password' : 'Show password'} onClick={() => setShow((v) => !v)}>{show ? <EyeOff size={16} /> : <Eye size={16} />}</button>
      </span>
    </label>
  )
}

function useCountdown() {
  const [left, setLeft] = useState(0)
  useEffect(() => {
    if (left <= 0) return
    const t = setTimeout(() => setLeft((n) => n - 1), 1000)
    return () => clearTimeout(t)
  }, [left])
  return [left, () => setLeft(RESEND_SECONDS)] as const
}

/** register: details > emailSent (waiting for the link) > verify (email proven; password + SMS code) */
type Step = 'details' | 'emailSent' | 'verify'

export default function Login({ initial = 'login' }: { initial?: 'login' | 'register' }) {
  const { acceptSession } = useAuth()
  const nav = useNavigate()
  const loc = useLocation() as { state?: { from?: string } }
  const [mode, setMode] = useState<'login' | 'register'>(initial)
  const [step, setStep] = useState<Step>('details')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [info, setInfo] = useState('')
  const [done, setDone] = useState('')
  const [left, startCountdown] = useCountdown()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [dial, setDial] = useState('+91')
  const [mobile, setMobile] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState('CUSTOMER')
  const [address, setAddress] = useState('')
  const [askEmail, setAskEmail] = useState(false)
  const emailToken = useRef<string>('')

  const phone = toE164(dial, mobile)
  const draft = (): Draft => ({ name: name.trim(), email: email.trim(), dial, mobile, role, address: address.trim() })
  const restore = (d: Draft) => { setName(d.name); setEmail(d.email); setDial(d.dial); setMobile(d.mobile); setRole(d.role); setAddress(d.address) }

  const reset = (m: 'login' | 'register') => {
    setMode(m); setStep('details'); setErr(''); setInfo(''); setDone(''); setPassword(''); setPassword2('')
    nav(m === 'register' ? '/register' : '/login', { replace: true, state: loc.state })
  }
  const run = async (fn: () => Promise<void>) => {
    setBusy(true); setErr(''); setInfo('')
    try { await fn() } catch (e) { setErr(errText(e)) } finally { setBusy(false) }
  }

  // Coming back from the emailed Firebase link: restore the saved details and finish the email proof.
  useEffect(() => {
    if (initial !== 'register') return
    let alive = true
    void (async () => {
      const d = loadDraft()
      if (d) restore(d)
      try {
        const saved = sessionStorage.getItem(TOKEN_KEY)
        if (saved && d) { emailToken.current = saved; if (alive) { setMode('register'); setStep('verify') } return }
      } catch { /* ignore */ }
      if (!(await isEmailLink())) return
      if (!alive) return
      setMode('register')
      const addr = d?.email || rememberedEmail()
      if (!addr) { setAskEmail(true); setStep('emailSent'); setInfo('Type the email address you registered with to finish verifying it.'); return }
      await finishEmailLink(addr, !d)
    })()
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const finishEmailLink = async (addr: string, lostDraft: boolean) => {
    setBusy(true); setErr('')
    try {
      emailToken.current = await completeEmailLink(addr)
      try { sessionStorage.setItem(TOKEN_KEY, emailToken.current) } catch { /* ignore */ }
      setEmail(addr); setAskEmail(false)
      window.history.replaceState(null, '', '/register') // drop the one-time link parameters from the address bar
      setStep('verify')
      setInfo(lostDraft ? 'Email verified. Re-enter your details, then continue.' : 'Email verified. Now set a password and verify your mobile number.')
      if (lostDraft) setStep('details')
    } catch (e) { setErr(errText(e)); setStep('details') } finally { setBusy(false) }
  }

  // ---- sign in
  const signIn = () => run(async () => {
    if (!EMAIL_OK.test(email.trim())) throw new Error('Enter a valid email address')
    if (!password) throw new Error('Enter your password')
    const t = await http.login(email.trim(), password)
    acceptSession(t)
    nav(loc.state?.from && loc.state.from !== '/login' ? loc.state.from : '/dashboard', { replace: true })
  })

  // ---- register
  const sendLink = () => run(async () => {
    if (name.trim().length < 2) throw new Error('Enter your name')
    if (!EMAIL_OK.test(email.trim())) throw new Error('Enter a valid email address')
    if (mobile.replace(/\D/g, '').length < 6) throw new Error('Enter your mobile number')
    if (role === 'CUSTOMER' && !address.trim()) throw new Error('Enter your service address')
    await http.registerStart({ name: name.trim(), email: email.trim(), phone, role, address: address.trim() || undefined }) // rejects duplicates early
    saveDraft(draft())
    await sendEmailLink(email.trim(), `${window.location.origin}/register`)
    setStep('emailSent'); setInfo(`We emailed a verification link to ${email.trim()}. Open it in this browser.`); startCountdown()
  })
  const confirmTypedEmail = () => run(async () => {
    if (!EMAIL_OK.test(email.trim())) throw new Error('Enter a valid email address')
    await finishEmailLink(email.trim(), !loadDraft())
  })
  const finishRegister = () => run(async () => {
    if (!PASSWORD_OK.test(password)) throw new Error('Password must be 8-72 characters with at least one letter and one digit')
    if (password !== password2) throw new Error('The two passwords do not match')
    if (!emailToken.current) throw new Error('Verify your email first')
    const r = await http.registerAccount({ name: name.trim(), email: email.trim(), phone, role, address: address.trim() || undefined, password, emailIdToken: emailToken.current })
    clearDraft(); emailToken.current = ''; setPassword(''); setPassword2('')
    if (r.status === 'ACTIVE') { reset('login'); setInfo('Your account is ready. Sign in with your email and password.') }
    else setDone(r.message)
  })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (busy) return
    if (mode === 'login') return signIn()
    if (step === 'details') return sendLink()
    if (step === 'emailSent') return askEmail ? confirmTypedEmail() : undefined
    return finishRegister()
  }

  const stepNo = step === 'details' ? 1 : step === 'emailSent' ? 2 : 3

  return (
    <div className="login">
      <section className="hero">
        <div className="hero-top">
          <Logo dark sub />
          <div className="hero-tag"><i />Chennai field service desk</div>
        </div>
        <h1>Every job,<br /><span>from call to invoice.</span></h1>
        <p>Manage service requests, assign technicians, track work orders, handle <b>inventory</b>, and deliver great customer experiences — all in one powerful platform.</p>
        <ul className="feat">
          {features.map((f, i) => (
            <li key={f.label} style={{ animationDelay: `${i * 70 + 200}ms` }}><span style={{ background: '#f59e0b' }}><f.icon size={20} /></span>{f.label}</li>
          ))}
        </ul>
      </section>

      <section className="login-r">
        <div className="lang"><Globe size={17} /> English</div>
        <form className="login-card" onSubmit={submit} noValidate>
          <Logo sub />
          <div className="auth-tabs" role="tablist">
            <button type="button" role="tab" aria-selected={mode === 'login'} className={mode === 'login' ? 'on' : ''} onClick={() => reset('login')}><LogIn size={15} /> Sign in</button>
            <button type="button" role="tab" aria-selected={mode === 'register'} className={mode === 'register' ? 'on' : ''} onClick={() => reset('register')}><UserPlus size={15} /> Register</button>
          </div>

          {done ? (
            <div className="done" role="status">
              <ShieldCheck size={30} />
              <h2>Verified</h2>
              <p>{done}</p>
              <button type="button" className="btn big" onClick={() => reset('login')}>Back to sign in</button>
            </div>
          ) : (
            <>
              <h2>{mode === 'login' ? 'Welcome Back' : 'Create your account'}</h2>
              <p className="muted">{mode === 'login' ? 'Sign in with your email and password.' : 'We verify your email address before the account is created.'}</p>

              {mode === 'register' && (
                <ol className="vsteps" aria-label="Registration steps">
                  <li className={stepNo >= 1 ? 'on' : ''}>Details</li>
                  <li className={stepNo >= 2 ? 'on' : ''}>Email link</li>
                  <li className={stepNo >= 3 ? 'on' : ''}>Set password</li>
                </ol>
              )}

              {mode === 'register' && step === 'details' && (
                <>
                  <label className="field"><span className="field-l">I am a</span>
                    <select value={role} onChange={(e) => setRole(e.target.value)}>{ROLES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
                  </label>
                  <label className="field"><span className="field-l">Full name</span>
                    <span className="inp"><Users size={17} /><input autoComplete="name" maxLength={120} placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} /></span>
                  </label>
                </>
              )}

              {(mode === 'login' || step === 'details' || askEmail) && (
                <label className="field"><span className="field-l">Email address</span>
                  <span className="inp"><Mail size={17} /><input type="email" autoComplete="email" maxLength={160} placeholder="you@example.com" value={email} onChange={(e) => { setEmail(e.target.value); setErr('') }} /></span>
                </label>
              )}

              {mode === 'login' && <PasswordInput label="Password" value={password} onChange={setPassword} auto="current-password" />}

              {mode === 'register' && step === 'details' && (
                <label className="field"><span className="field-l">Mobile number</span>
                  <span className="phone-row">
                    <select aria-label="Country code" value={dial} onChange={(e) => setDial(e.target.value)}>{COUNTRIES.map(([d, l]) => <option key={d} value={d}>{l}</option>)}</select>
                    <span className="inp"><Phone size={17} /><input type="tel" inputMode="tel" autoComplete="tel-national" maxLength={15} placeholder="98765 43210" value={mobile} onChange={(e) => { setMobile(e.target.value); setErr('') }} /></span>
                  </span>
                </label>
              )}

              {mode === 'register' && step === 'details' && role === 'CUSTOMER' && (
                <label className="field"><span className="field-l">Service address</span>
                  <span className="inp"><MapPin size={17} /><input autoComplete="street-address" maxLength={300} placeholder="House no, street, area, city" value={address} onChange={(e) => setAddress(e.target.value)} /></span>
                </label>
              )}

              {mode === 'register' && step === 'emailSent' && !askEmail && (
                <div className="mailnote">
                  <Mail size={22} />
                  <p>Open the email from Firebase and click the link. This page continues automatically in the tab that opens.</p>
                  <button type="button" className="link" disabled={left > 0 || busy} onClick={() => sendLink()}>{left > 0 ? `Resend link in ${left}s` : 'Resend link'}</button>
                  {' · '}<button type="button" className="link" onClick={() => { setStep('details'); setErr(''); setInfo('') }}>Change details</button>
                </div>
              )}

              {mode === 'register' && step === 'verify' && (
                <>
                  <p className="okline"><CheckCircle2 size={16} /> Email verified: {email.trim()}</p>
                  <PasswordInput label="Choose a password" value={password} onChange={setPassword} auto="new-password" hint="8+ characters, a letter and a digit" />
                  <PasswordInput label="Confirm password" value={password2} onChange={setPassword2} auto="new-password" />
                </>
              )}

              {err && <div className="err" role="alert">{err}</div>}
              {info && !err && <div className="info" role="status">{info}</div>}

              {!(mode === 'register' && step === 'emailSent' && !askEmail) && (
                <button type="submit" className="btn p big" disabled={busy}>
                  {busy ? 'Please wait…'
                    : mode === 'login' ? <><LogIn size={18} /> Sign in</>
                    : step === 'details' ? <><Mail size={18} /> Verify my email</>
                    : step === 'emailSent' ? <><Mail size={18} /> Confirm email</>
                    : <><ShieldCheck size={18} /> Create account</>}
                </button>
              )}

              <p className="muted center">
                {mode === 'login'
                  ? <>New here? <button type="button" className="link" onClick={() => reset('register')}>Create an account</button></>
                  : <>Already registered? <button type="button" className="link" onClick={() => reset('login')}>Sign in</button></>}
              </p>
              <p className="muted center small">{mode === 'login' ? <>Forgot your password? <Link to="/forgot-password">Reset it by email</Link></> : 'Administrator accounts are created by an existing administrator.'}</p>
            </>
          )}
        </form>
      </section>
    </div>
  )
}
