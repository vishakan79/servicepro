import { SUPABASE } from '../api/config'

/**
 * Email proof through Supabase Auth: Supabase mails a one-time code (and a link); the person types the code or opens the link.
 * Plain REST calls, so no extra library is shipped. The resulting access token is verified again by our server.
 */
const EMAIL_KEY = 'sp.emailForSignIn'
const remember = (email: string) => { try { localStorage.setItem(EMAIL_KEY, email) } catch { /* private mode */ } }
export const rememberedEmail = (): string => { try { return localStorage.getItem(EMAIL_KEY) ?? '' } catch { return '' } }

async function call<T>(path: string, body: unknown): Promise<T> {
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
    if (code === 'otp_expired' || /expired|invalid/i.test(data.msg ?? data.message ?? '')) throw new Error('That code is not correct or has expired. Request a new one.')
    throw new Error(data.msg ?? data.error_description ?? data.message ?? 'Email verification failed. Try again.')
  }
  return data as T
}

/** Emails a verification code/link. `returnUrl` is where the emailed link lands. */
export async function sendEmailCode(email: string, returnUrl: string): Promise<void> {
  await call(`/otp?redirect_to=${encodeURIComponent(returnUrl)}`, { email, create_user: true })
  remember(email)
}

/** Checks the typed code and returns a Supabase access token proving the mailbox, for our server to verify. */
export async function verifyEmailCode(email: string, code: string): Promise<string> {
  const r = await call<{ access_token?: string }>('/verify', { type: 'email', email, token: code.replace(/\s/g, '') })
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
