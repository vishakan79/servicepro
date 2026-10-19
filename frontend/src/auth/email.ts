import { SUPABASE } from '../api/config'

/**
 * Email proof through Supabase Auth: Supabase mails a one-time code (and a link); the person types the code or opens the link.
 * Plain REST calls, so no extra library is shipped. The resulting access token is verified again by our server.
 */
const EMAIL_KEY = 'sp.emailForSignIn'
const remember = (email: string) => { try { localStorage.setItem(EMAIL_KEY, email) } catch { /* private mode */ } }
export const rememberedEmail = (): string => { try { return localStorage.getItem(EMAIL_KEY) ?? '' } catch { return '' } }

async function call<T>(path: string, body: unknown, verifying = false): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${SUPABASE.url}/auth/v1${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: SUPABASE.anonKey },
      body: JSON.stringify(body),
    })
  } catch {
    throw new Error('Network problem. Check your connection.')
  }
  const data = (await res.json().catch(() => ({}))) as { msg?: string; error_description?: string; message?: string; error_code?: string }
  if (!res.ok) {
    const code = data.error_code ?? ''
    if (res.status === 429 || code === 'over_email_send_rate_limit') throw new Error('Too many emails requested. Please wait a few minutes and try again.')
    const raw = data.msg ?? data.error_description ?? data.message ?? ''
    if (verifying && (code === 'otp_expired' || /expired|invalid/i.test(raw))) throw new Error('That code is not correct or has expired. Request a new one.')
    if (!verifying) {
      if (code === 'email_address_not_authorized') throw new Error('Email sending is not set up yet: the Supabase project needs custom SMTP (Auth > Emails > SMTP Settings).')
      if (code === 'unexpected_failure' || /sending .*email/i.test(raw)) throw new Error('The email could not be sent. The mail (SMTP) settings in Supabase need to be checked.')
      throw new Error(`${raw || 'Could not send the code.'}${code ? ` (${code})` : ''}`)
    }
    throw new Error(data.msg ?? data.error_description ?? data.message ?? 'Email verification failed. Try again.')
  }
  return data as T
}

/** Emails a verification code/link. `returnUrl` is where the emailed link lands. */
export async function sendEmailCode(email: string, returnUrl: string): Promise<void> {
  try { localStorage.setItem('sp.emailReturn', new URL(returnUrl).pathname) } catch { /* ignore */ }
  await call(`/otp?redirect_to=${encodeURIComponent(returnUrl)}`, { email, create_user: true })
  remember(email)
}

/** Checks the typed code and returns a Supabase access token proving the mailbox, for our server to verify. */
export async function verifyEmailCode(email: string, code: string): Promise<string> {
  const r = await call<{ access_token?: string }>('/verify', { type: 'email', email, token: code.replace(/\s/g, '') }, true)
  if (!r.access_token) throw new Error('Email verification failed. Request a new code.')
  return r.access_token
}

/** True when the page was opened from the emailed link (Supabase puts the token in the address fragment). */
export function isEmailLink(): boolean {
  return /[#&]access_token=/.test(window.location.hash)
}

/** Reads the token from the emailed link and clears it from the address bar. */
export function takeLinkToken(): string {
  const p = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  const t = p.get('access_token') ?? ''
  window.history.replaceState(null, '', window.location.pathname)
  return t
}

/** If the emailed link opened on the wrong page (Supabase falls back to its Site URL), move it to the page that asked for it, keeping the token. */
export function routeEmailLink(): void {
  if (!isEmailLink()) return
  let target = '/register'
  try { target = localStorage.getItem('sp.emailReturn') || target } catch { /* ignore */ }
  if (window.location.pathname !== target) window.history.replaceState(null, '', target + window.location.hash)
}
