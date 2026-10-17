import { FormEvent, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, ShieldCheck } from 'lucide-react'
import { completeEmailLink, isEmailLink, rememberedEmail, sendEmailLink } from '../auth/firebase'
import { resetPassword } from '../api/http'
import { Logo } from '../components/Layout'
import { PasswordInput } from './Login'

const errText = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong. Try again.')
const RULE = /^(?=.*[A-Za-z])(?=.*[0-9]).{8,72}$/

/** Email-link password reset: prove the mailbox with Firebase, then set a new password on our server. */
export default function ForgotPassword() {
  const nav = useNavigate()
  const [email, setEmail] = useState(rememberedEmail())
  const [step, setStep] = useState<'ask' | 'sent' | 'set' | 'done'>('ask')
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const token = useRef('')

  useEffect(() => {
    let alive = true
    ;(async () => {
      if (!(await isEmailLink())) return
      const addr = rememberedEmail()
      if (!addr) { if (alive) { setStep('sent'); setErr('Type the email you used on this page to finish.') } return }
      try {
        token.current = await completeEmailLink(addr)
        if (alive) { setEmail(addr); setStep('set') }
      } catch (e) { if (alive) setErr(errText(e)) }
    })()
    return () => { alive = false }
  }, [])

  const run = async (fn: () => Promise<void>) => { setErr(''); setBusy(true); try { await fn() } catch (e) { setErr(errText(e)) } finally { setBusy(false) } }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (step === 'ask') return void run(async () => {
      if (!/^\S+@\S+\.\S+$/.test(email.trim())) throw new Error('Enter a valid email address.')
      await sendEmailLink(email.trim().toLowerCase(), `${window.location.origin}/forgot-password`)
      setStep('sent')
    })
    if (step === 'sent') return void run(async () => {
      token.current = await completeEmailLink(email.trim().toLowerCase())
      setStep('set')
    })
    if (step === 'set') return void run(async () => {
      if (!RULE.test(pw)) throw new Error('Password must be 8-72 characters with a letter and a number.')
      if (pw !== pw2) throw new Error('Passwords do not match.')
      await resetPassword({ email: email.trim().toLowerCase(), password: pw, emailIdToken: token.current })
      setStep('done')
    })
  }

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 16 }}>
      <form className="login-card" onSubmit={submit} noValidate>
        <Logo sub />
        <h2>Reset your password</h2>
        {step === 'ask' && <p className="muted">Enter your account email. We will send a verification link.</p>}
        {step === 'sent' && <p className="muted">We emailed a link to {email}. Open it in this browser, then come back here.</p>}
        {(step === 'ask' || (step === 'sent' && !!err)) && (
          <label className="field"><span className="field-l">Email</span>
            <span className="inp"><Mail size={17} /><input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></span>
          </label>
        )}
        {step === 'set' && <>
          <PasswordInput label="New password" value={pw} onChange={setPw} auto="new-password" hint="8+ characters, letter and number" />
          <PasswordInput label="Confirm password" value={pw2} onChange={setPw2} auto="new-password" />
        </>}
        {step === 'done' && <div className="info" role="status">Password updated. You can sign in now.</div>}
        {err && <div className="err" role="alert">{err}</div>}
        {step !== 'done' && step !== 'sent' && (
          <button type="submit" className="btn p big" disabled={busy}>{busy ? 'Please wait…' : step === 'ask' ? <><Mail size={18} /> Send reset link</> : <><ShieldCheck size={18} /> Update password</>}</button>
        )}
        {step === 'sent' && !!err && <button type="submit" className="btn p big" disabled={busy}>Continue</button>}
        {step === 'done' && <button type="button" className="btn p big" onClick={() => nav('/login')}>Go to sign in</button>}
        <p className="muted center"><Link to="/login">Back to sign in</Link></p>
      </form>
    </div>
  )
}
