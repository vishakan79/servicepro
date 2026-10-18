import { API_BASE } from './config'

/** Error thrown for every non-2xx response, carrying the server's message and per-field validation errors. */
export class ApiError extends Error {
  constructor(public status: number, message: string, public fieldErrors?: Record<string, string>) {
    super(message)
  }
}

// The access token lives only in memory (never localStorage): an XSS cannot read it from storage, and the
// httpOnly refresh cookie restores the session after a reload.
let accessToken: string | null = null
let onSessionLost: (() => void) | null = null
let refreshing: Promise<TokenResponse | null> | null = null

export const getToken = () => accessToken
export const setToken = (t: string | null) => { accessToken = t }
export const setSessionLostHandler = (fn: (() => void) | null) => { onSessionLost = fn }

export interface TokenResponse {
  accessToken: string
  tokenType: string
  expiresIn: number
  user: { id: number; name: string; email: string; phone?: string | null; role: string; customerId?: number | null; technicianId?: number | null }
}

async function parseError(res: Response): Promise<ApiError> {
  try {
    const b = await res.json()
    return new ApiError(res.status, b.message ?? res.statusText, b.fieldErrors ?? undefined)
  } catch {
    if ([502, 503, 504].includes(res.status)) return new ApiError(res.status, 'The server is waking up (free hosting). Please wait about a minute and try again.')
    return new ApiError(res.status, res.statusText || 'Request failed')
  }
}

/** Single-flight: refresh tokens rotate, so two parallel refreshes would trip the server's reuse detection. */
export function refreshSession(): Promise<TokenResponse | null> {
  if (!refreshing) {
    refreshing = fetch(`${API_BASE}/api/auth/refresh`, { method: 'POST', credentials: 'include' })
      .then(async (res) => {
        if (!res.ok) { setToken(null); return null }
        const body = (await res.json()) as TokenResponse
        setToken(body.accessToken)
        return body
      })
      .catch(() => null)
      .finally(() => { refreshing = null })
  }
  return refreshing
}

async function authPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}/api/auth${path}`, {
    method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  })
  if (!res.ok) throw await parseError(res)
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T)
}

async function startSession(t: TokenResponse): Promise<TokenResponse> {
  setToken(t.accessToken)
  return t
}

/** Email + password sign-in. The server counts failures per address and never says which of the two was wrong. */
export const login = async (email: string, password: string) => startSession(await authPost<TokenResponse>('/login', { email, password }))

export interface RegisterDetails { name: string; email: string; phone: string; role: string; address?: string }
export interface RegisterResponse { status: 'ACTIVE' | 'PENDING_APPROVAL'; message: string }
/** Checks the role, email and mobile are free to use. Sends nothing. */
export const registerStart = (d: RegisterDetails) => authPost<void>('/register/start', d)
/** The id comes from Firebase's email-link sign-in. No session is created; the person signs in next. */
export const registerAccount = (d: RegisterDetails & { password: string; emailIdToken: string }) =>
  authPost<RegisterResponse>('/register', d)

export async function logout(): Promise<void> {
  try { await fetch(`${API_BASE}/api/auth/logout`, { method: 'POST', credentials: 'include' }) } catch { /* offline: cookie expires anyway */ }
  setToken(null)
}

interface Opts { method?: string; body?: unknown; query?: Record<string, string | number | undefined> }

export async function api<T>(path: string, opts: Opts = {}): Promise<T> {
  const qs = opts.query
    ? '?' + Object.entries(opts.query).filter(([, v]) => v !== undefined).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join('&')
    : ''
  const send = () =>
    fetch(`${API_BASE}/api${path}${qs}`, {
      method: opts.method ?? 'GET',
      credentials: 'include',
      headers: { ...(opts.body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    })
  let res = await send()
  if (res.status === 401) {
    if (await refreshSession()) res = await send()
    else { onSessionLost?.(); throw new ApiError(401, 'Session expired') }
  }
  if (!res.ok) throw await parseError(res)
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

export interface Page<T> { content: T[]; page: number; size: number; totalElements: number; totalPages: number }

/** Reads every page of a list endpoint (100 rows per request, the server's cap). */
export async function fetchAll<T>(path: string, query: Record<string, string | number | undefined> = {}): Promise<T[]> {
  const out: T[] = []
  for (let page = 0; ; page++) {
    const p = await api<Page<T>>(path, { query: { ...query, page, size: 100 } })
    out.push(...p.content)
    if (page + 1 >= p.totalPages) return out
  }
}

export const resetPassword = (d: { email: string; password: string; emailIdToken: string }) => authPost<void>('/password/reset', d)

/** Fire-and-forget request that wakes a sleeping free-tier server while the person is still filling in the form. */
export function warmUp(): void {
  try { void fetch(`${API_BASE}/api/auth/ping`, { method: 'GET' }).catch(() => undefined) } catch { /* ignore */ }
}
