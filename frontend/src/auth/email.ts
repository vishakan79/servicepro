import { API_BASE } from '../api/config'

/** Email proof: our own server mails a 6-digit code; a correct code is exchanged for a short-lived signed proof the server accepts. */
const EMAIL_KEY = 'sp.emailForSignIn'
const remember = (email: string) => { try { localStorage.setItem(EMAIL_KEY, email) } catch { /* private mode */ } }
export const rememberedEmail = (): string => { try { return localStorage.getItem(EMAIL_KEY) ?? '' } catch { return '' } }

async function post<T>(path: string, body: unknown): Promise<T | null> {
  let res: Response
  try {
    res = await fetch(`${API_BASE}/api/auth/email/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  } catch {
    throw new Error('Network problem. Check your connection.')
  }
  if (res.status === 204) return null
  const data = (await res.json().catch(() => ({}))) as { message?: string; proof?: string }
  if (!res.ok) {
    if ([502, 503, 504].includes(res.status) && !data.message) throw new Error('The server is busy. Please try again in a moment.')
    throw new Error(data.message ?? 'Request failed. Try again.')
  }
  return data as T
}

/** Emails a 6-digit verification code. */
export async function sendEmailCode(email: string): Promise<void> {
  await post('send', { email })
  remember(email)
}

/** Checks the typed code and returns a signed proof of the mailbox, for the register / reset request. */
export async function verifyEmailCode(email: string, code: string): Promise<string> {
  const r = await post<{ proof: string }>('verify', { email, code: code.replace(/\s/g, '') })
  if (!r?.proof) throw new Error('Email verification failed. Request a new code.')
  return r.proof
}
