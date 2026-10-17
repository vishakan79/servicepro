import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  Bell, CalendarDays, ClipboardList, FileText, LayoutDashboard, LogOut, Menu, MessageSquare, Package, Settings as Cog,
  ShieldCheck, Users, UserCog, Wrench, BarChart3, Inbox, X, ChevronDown, MapPin, Plus,
} from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { useStore } from '../api/store'
import { fmtDateTime } from '../api/format'
import { Avatar } from './ui'
import ChatWidget from './ChatWidget'
import { Role } from '../types'
import '../styles/glass.css'

export function Logo({ dark = false, sub = false }: { dark?: boolean; sub?: boolean }) {
  return (
    <div className="logo">
      <span className="logo-m"><Wrench size={20} strokeWidth={2.4} /></span>
      <span>
        <span className={`logo-t ${dark ? 'dark' : ''}`}>Service<b>Pro</b></span>
        {sub && <span className="logo-s">Field Service Management</span>}
      </span>
    </div>
  )
}

const ALL: Role[] = ['ADMIN', 'MANAGER', 'TECHNICIAN', 'CUSTOMER']
const STAFF: Role[] = ['ADMIN', 'MANAGER']
export const NAV: { to: string; label: string; icon: typeof Bell; roles: Role[] }[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ALL },
  { to: '/requests', label: 'Service Requests', icon: Inbox, roles: ['ADMIN', 'MANAGER', 'CUSTOMER'] },
  { to: '/my-jobs', label: 'My Jobs', icon: ClipboardList, roles: ['TECHNICIAN'] },
  { to: '/work-orders', label: 'Work Orders', icon: ClipboardList, roles: ALL },
  { to: '/appointments', label: 'Appointments', icon: CalendarDays, roles: ALL },
  { to: '/tracking', label: 'Live Tracking', icon: MapPin, roles: STAFF },
  { to: '/customers', label: 'Customers', icon: Users, roles: STAFF },
  { to: '/technicians', label: 'Technicians', icon: UserCog, roles: STAFF },
  { to: '/inventory', label: 'Inventory', icon: Package, roles: ['ADMIN', 'MANAGER', 'TECHNICIAN', 'INVENTORY_MANAGER'] },
  { to: '/equipment', label: 'Equipment & AMC', icon: Package, roles: ['ADMIN', 'MANAGER', 'CUSTOMER'] },
  { to: '/invoices', label: 'Invoices', icon: FileText, roles: ['ADMIN', 'MANAGER', 'CUSTOMER'] },
  { to: '/reports', label: 'Reports', icon: BarChart3, roles: STAFF },
  { to: '/feedback', label: 'Feedback', icon: MessageSquare, roles: ['ADMIN', 'MANAGER', 'TECHNICIAN', 'CUSTOMER'] },
  { to: '/users', label: 'Users & Roles', icon: ShieldCheck, roles: ['ADMIN'] },
  { to: '/inquiries', label: 'Demo requests', icon: Inbox, roles: ['ADMIN'] },
  { to: '/settings', label: 'Settings', icon: Cog, roles: [...ALL, 'INVENTORY_MANAGER'] },
]

const PRIMARY = 4 // items shown in the header bar; the rest sit under "More"

export default function Layout() {
  const { user, logout } = useAuth()
  const { toasts, dismiss, activity, unread, markRead } = useStore()
  const nav = useNavigate()
  const loc = useLocation()
  const [open, setOpen] = useState(false)
  const [bell, setBell] = useState(false)
  const [menu, setMenu] = useState(false)
  const [more, setMore] = useState(false)
  const ref = useRef<HTMLElement>(null)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => { const f = () => setScrolled(window.scrollY > 8); f(); addEventListener('scroll', f, { passive: true }); return () => removeEventListener('scroll', f) }, [])
  useEffect(() => { setOpen(false); setBell(false); setMenu(false); setMore(false); window.scrollTo(0, 0) }, [loc.pathname])
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) { setBell(false); setMenu(false); setMore(false) } }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!user) return null
  const items = NAV.filter((n) => n.roles.includes(user.role))
  const main = items.slice(0, PRIMARY)
  const rest = items.slice(PRIMARY)
  const canCreate = user.role !== 'TECHNICIAN' && user.role !== 'INVENTORY_MANAGER'
  const has = (to: string) => items.some((n) => n.to === to)
  const fl = (to: string, label: string) => (has(to) ? <Link to={to}>{label}</Link> : null)
  const moreActive = rest.some((n) => loc.pathname.startsWith(n.to))

  return (
    <div className="app">
      <header className={`hdr ${scrolled ? 'scrolled' : ''}`} ref={ref}>
        <div className="wrap hdr-in">
          <Link to="/dashboard" className="hdr-logo" aria-label="ServicePro home"><Logo /></Link>

          <nav className="menu" aria-label="Main">
            {main.map((n) => (
              <NavLink key={n.to} to={n.to} className={({ isActive }) => `m-link ${isActive ? 'on' : ''}`}>{n.label}</NavLink>
            ))}
            {rest.length > 0 && (
              <div className="rel">
                <button className={`m-link ${moreActive ? 'on' : ''}`} onClick={() => { setMore(!more); setBell(false); setMenu(false) }} aria-haspopup="menu" aria-expanded={more}>
                  More <ChevronDown size={14} />
                </button>
                {more && (
                  <div className="drop left" role="menu">
                    {rest.map((n) => (
                      <NavLink key={n.to} to={n.to} className="drop-i row" role="menuitem"><n.icon size={16} /> {n.label}</NavLink>
                    ))}
                  </div>
                )}
              </div>
            )}
          </nav>

          <div className="hdr-r">
            <div className="rel">
              <button className="icon-btn bell" aria-label="Notifications" onClick={() => { setBell(!bell); setMenu(false); setMore(false); markRead() }}>
                <Bell size={19} />
                {unread > 0 && <span className="dot">{unread > 9 ? '9+' : unread}</span>}
              </button>
              {bell && (
                <div className="drop wide" role="menu">
                  <div className="drop-h">Notifications</div>
                  {activity.length === 0 && <div className="drop-i"><small>No notifications yet.</small></div>}
                  {activity.slice(0, 6).map((a) => (
                    <div key={a.id} className="drop-i"><span>{a.text}</span><small>{fmtDateTime(a.at)}</small></div>
                  ))}
                </div>
              )}
            </div>
            {canCreate && <Link to="/requests/new" className="btn p cta"><Plus size={16} /> New Request</Link>}
            <div className="rel">
              <button className="who" onClick={() => { setMenu(!menu); setBell(false); setMore(false) }} aria-haspopup="menu" aria-expanded={menu} aria-label="Account menu">
                <Avatar name={user.name} size={34} />
                <span className="who-t"><b>{user.name}</b><small>{user.role[0] + user.role.slice(1).toLowerCase()}</small></span>
                <ChevronDown size={15} />
              </button>
              {menu && (
                <div className="drop" role="menu">
                  <button className="drop-b" onClick={() => nav('/settings')}><Cog size={15} /> Settings</button>
                  <button className="drop-b" onClick={() => { logout(); nav('/login') }}><LogOut size={15} /> Sign out</button>
                </div>
              )}
            </div>
          </div>

          <button className="icon-btn burger" onClick={() => setOpen(true)} aria-label="Open menu" aria-expanded={open}><Menu size={22} /></button>
        </div>
      </header>

      {open && <div className="scrim" onClick={() => setOpen(false)} />}
      <aside className={`drawer ${open ? 'open' : ''}`} aria-hidden={!open} aria-label="Menu">
        <div className="drawer-top">
          <Logo />
          <button className="icon-btn" onClick={() => setOpen(false)} aria-label="Close menu"><X size={20} /></button>
        </div>
        <nav>
          {items.map((n) => (
            <NavLink key={n.to} to={n.to} className={({ isActive }) => `d-link ${isActive ? 'on' : ''}`}><n.icon size={18} /> {n.label}</NavLink>
          ))}
        </nav>
        <div className="drawer-foot">
          {canCreate && <Link to="/requests/new" className="btn p big"><Plus size={16} /> New Request</Link>}
          <button className="btn big" onClick={() => { logout(); nav('/login') }}><LogOut size={16} /> Sign out</button>
        </div>
      </aside>

      <main className="content wrap"><Outlet /></main>
      {user?.role === 'CUSTOMER' && <ChatWidget />}

      <footer className="ftr">
        <div className="wrap ftr-in">
          <div className="ftr-brand">
            <Logo dark />
            <p>Field service operations in one place: requests, dispatch, parts, invoices and customer feedback.</p>
          </div>
          <div>
            <h4>Operations</h4>
            {fl('/requests', 'Service Requests')}
            {fl('/work-orders', 'Work Orders')}
            {fl('/appointments', 'Appointments')}
          </div>
          <div>
            <h4>Business</h4>
            {fl('/invoices', 'Invoices')}
            {fl('/inventory', 'Inventory')}
            {fl('/feedback', 'Feedback')}
          </div>
          <div>
            <h4>Account</h4>
            <Link to="/settings">Settings</Link>
            <button onClick={() => { logout(); nav('/login') }}>Sign out</button>
          </div>
        </div>
        <div className="wrap ftr-base">© {new Date().getFullYear()} ServicePro · Chennai field service desk</div>
      </footer>

      <div className="toasts" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.tone}`}>
            <span>{t.text}</span>
            <button onClick={() => dismiss(t.id)} aria-label="Dismiss"><X size={14} /></button>
          </div>
        ))}
      </div>
    </div>
  )
}
