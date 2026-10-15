import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import * as http from '../api/http'
import { toUser } from '../api/mappers'
import { Role, User } from '../types'

interface Auth {
  user: User | null
  /** false while the session is being restored from the refresh cookie */
  ready: boolean
  /** called by the sign-in / register screens after the server accepted the OTP */
  acceptSession: (t: http.TokenResponse) => void
  logout: () => void
  can: (...roles: Role[]) => boolean
}

const Ctx = createContext<Auth | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    http.setSessionLostHandler(() => setUser(null))
    let alive = true
    // Reload: the access token lived only in memory, so ask the server to mint one from the httpOnly refresh cookie.
    void http.refreshSession().then((t) => {
      if (!alive) return
      setUser(t ? toUser(t.user) : null)
      setReady(true)
    })
    return () => { alive = false; http.setSessionLostHandler(null) }
  }, [])

  const acceptSession: Auth['acceptSession'] = (t) => { setUser(toUser(t.user)); setReady(true) }
  const logout = () => { void http.logout(); setUser(null) }
  const can = (...roles: Role[]) => !!user && roles.includes(user.role)

  return <Ctx.Provider value={{ user, ready, acceptSession, logout, can }}>{children}</Ctx.Provider>
}

export function useAuth() {
  const c = useContext(Ctx)
  if (!c) throw new Error('AuthProvider missing')
  return c
}

export function RequireRole({ roles, children }: { roles?: Role[]; children: ReactNode }) {
  const { user, ready } = useAuth()
  const loc = useLocation()
  if (!ready) return <div className="boot" role="status">Loading…</div>
  if (!user) return <Navigate to="/login" state={{ from: loc.pathname }} replace />
  if (roles && !roles.includes(user.role)) return <Navigate to="/forbidden" replace />
  return <>{children}</>
}
