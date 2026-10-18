import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import { RequireRole, useAuth } from './auth/AuthContext'
import Login from './pages/Login'
import MyJobs from './pages/MyJobs'
import ForgotPassword from './pages/ForgotPassword'
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Requests = lazy(() => import('./pages/Requests'))
const NewRequest = lazy(() => import('./pages/NewRequest'))
const WorkOrders = lazy(() => import('./pages/WorkOrders'))
const WorkOrderDetail = lazy(() => import('./pages/WorkOrderDetail'))
const AssignTechnician = lazy(() => import('./pages/AssignTechnician'))
const Appointments = lazy(() => import('./pages/Appointments'))
const Tracking = lazy(() => import('./pages/Tracking'))
const Inventory = lazy(() => import('./pages/Inventory'))
const InvoiceList = lazy(() => import('./pages/Invoices').then((m) => ({ default: m.InvoiceList })))
const InvoiceDetail = lazy(() => import('./pages/Invoices').then((m) => ({ default: m.InvoiceDetail })))
const Reports = lazy(() => import('./pages/Reports'))
const Feedback = lazy(() => import('./pages/Feedback'))
const Customers = lazy(() => import('./pages/Directory').then((m) => ({ default: m.Customers })))
const Settings = lazy(() => import('./pages/Directory').then((m) => ({ default: m.Settings })))
const Technicians = lazy(() => import('./pages/Directory').then((m) => ({ default: m.Technicians })))
const AiHub = lazy(() => import('./pages/AiHub'))
const Equipment = lazy(() => import('./pages/Equipment'))
const Inquiries = lazy(() => import('./pages/Inquiries'))
const Home = lazy(() => import('./site/Home'))
const Users = lazy(() => import('./pages/Directory').then((m) => ({ default: m.Users })))

const STAFF = ['ADMIN', 'MANAGER'] as const

export default function App() {
  const { user } = useAuth()
  return (
    <Suspense fallback={<div className="boot" role="status">Loading…</div>}>
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/dashboard" replace /> : <Login initial="register" />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/forbidden" element={<div style={{ padding: 40 }}><h1>403 - You don't have access to this page</h1></div>} />
      <Route element={<RequireRole><Layout /></RequireRole>}>
        <Route path="/dashboard" element={user?.role === 'INVENTORY_MANAGER' ? <Navigate to="/inventory" replace /> : <Dashboard />} />
        <Route path="/requests" element={<RequireRole roles={['ADMIN', 'MANAGER', 'CUSTOMER']}><Requests /></RequireRole>} />
        <Route path="/requests/new" element={<RequireRole roles={['ADMIN', 'MANAGER', 'CUSTOMER']}><NewRequest /></RequireRole>} />
        <Route path="/my-jobs" element={<RequireRole roles={['TECHNICIAN']}><MyJobs /></RequireRole>} />
        <Route path="/work-orders" element={<WorkOrders />} />
        <Route path="/work-orders/:id" element={<WorkOrderDetail />} />
        <Route path="/work-orders/:id/assign" element={<RequireRole roles={[...STAFF]}><AssignTechnician /></RequireRole>} />
        <Route path="/appointments" element={<Appointments />} />
        <Route path="/tracking" element={<RequireRole roles={[...STAFF]}><Tracking /></RequireRole>} />
        <Route path="/customers" element={<RequireRole roles={[...STAFF]}><Customers /></RequireRole>} />
        <Route path="/technicians" element={<RequireRole roles={[...STAFF]}><Technicians /></RequireRole>} />
        <Route path="/inventory" element={<RequireRole roles={['ADMIN', 'MANAGER', 'TECHNICIAN', 'INVENTORY_MANAGER']}><Inventory /></RequireRole>} />
        <Route path="/invoices" element={<RequireRole roles={['ADMIN', 'MANAGER', 'CUSTOMER']}><InvoiceList /></RequireRole>} />
        <Route path="/invoices/:id" element={<RequireRole roles={['ADMIN', 'MANAGER', 'CUSTOMER']}><InvoiceDetail /></RequireRole>} />
        <Route path="/reports" element={<RequireRole roles={[...STAFF]}><Reports /></RequireRole>} />
        <Route path="/feedback" element={<Feedback />} />
        <Route path="/users" element={<RequireRole roles={['ADMIN']}><Users /></RequireRole>} />
        <Route path="/ai" element={<AiHub />} />
        <Route path="/equipment" element={<RequireRole roles={['ADMIN', 'MANAGER', 'CUSTOMER']}><Equipment /></RequireRole>} />
        <Route path="/inquiries" element={<RequireRole roles={['ADMIN']}><Inquiries /></RequireRole>} />
        <Route path="/settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to={user ? '/dashboard' : '/'} replace />} />
    </Routes>
    </Suspense>
  )
}
