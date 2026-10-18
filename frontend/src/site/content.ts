import { BarChart3, CalendarDays, ClipboardList, FileText, Inbox, MapPin, Package, ShieldCheck, Smartphone, Users, Wrench, Zap } from 'lucide-react'

export const SOLUTIONS = [
  { id: 'requests', icon: Inbox, title: 'Service requests', text: 'Capture every call, portal request or walk-in with priority, photos and the customer record attached.' },
  { id: 'dispatch', icon: CalendarDays, title: 'Scheduling and dispatch', text: 'Assign by skill, workload and availability. The calendar blocks double-booking before it happens.' },
  { id: 'orders', icon: ClipboardList, title: 'Work orders', text: 'A fixed lifecycle from created to completed, with checklists, notes, parts used and a full timeline.' },
  { id: 'inventory', icon: Package, title: 'Spare parts inventory', text: 'Stock drops when a technician uses a part. Low-stock and out-of-stock states show before a job is blocked.' },
  { id: 'billing', icon: FileText, title: 'Invoices and payments', text: 'An invoice is created when a job completes, with GST, line items and a payment record.' },
  { id: 'insight', icon: BarChart3, title: 'Reports and SLA tracking', text: 'Completion rate, workload per technician, ratings and every job against its priority deadline.' },
]

export const STEPS = [
  { title: 'Request arrives', text: 'A customer or coordinator logs the issue. A work order is created automatically.' },
  { title: 'Technician assigned', text: 'Pick one, or let the system rank by skill match, rating and workload that day.' },
  { title: 'On the way', text: 'The technician marks the job en route. The customer and the control desk see it at once.' },
  { title: 'Work in progress', text: 'Checklist items, notes and spare parts are recorded on the job as work happens.' },
  { title: 'Completed', text: 'The job closes only when the checklist is done. An invoice is generated from the job.' },
  { title: 'Paid and rated', text: 'Payment is recorded and the customer leaves feedback that feeds the reports.' },
]

export const ROLES = [
  { icon: ShieldCheck, name: 'Administrator', text: 'Users and roles, audit trail, every report, every record.' },
  { icon: Users, name: 'Manager', text: 'Dispatch board, technician workload, inventory, invoices, SLA alerts.' },
  { icon: Wrench, name: 'Technician', text: 'Only their own jobs: route, checklist, notes, parts and status updates from a phone.' },
  { icon: Smartphone, name: 'Customer', text: 'Raise a request, follow the technician, pay the invoice and leave feedback.' },
]

export const TOUR = [
  { id: 'dashboard', label: 'Dashboard', img: '/shots/dashboard.jpg', title: 'The day at a glance', text: 'Open requests, active jobs, pending appointments and overdue work, with a trend chart and the latest requests underneath.' },
  { id: 'order', label: 'Work order', img: '/shots/work-order.jpg', title: 'One page per job', text: 'Customer, technician, schedule, timeline, checklist, parts and feedback in a single view, with only the next valid status offered.' },
  { id: 'map', label: 'Live tracking', img: '/shots/tracking.jpg', title: 'See technicians on the map', text: 'Who is on the way, who is on site, who is free. Updates arrive over a live connection without refreshing.' },
]

export const PLATFORM = [
  { group: 'Front end', items: ['React 18', 'TypeScript', 'Vite', 'Responsive from 360 px'] },
  { group: 'Back end', items: ['Java 21', 'Spring Boot 3', 'Spring Security', 'REST + WebSocket (STOMP)'] },
  { group: 'Data', items: ['PostgreSQL 16', 'Flyway migrations', 'Redis', 'Audit log'] },
  { group: 'Delivery', items: ['Docker', 'GitHub Actions', 'AWS (EC2, RDS, ECR)', 'Vercel'] },
]

export const TRUST = [
  { icon: ShieldCheck, title: 'Role-based access', text: 'Every request is checked on the server. A customer can only ever read their own records.' },
  { icon: Zap, title: 'Short-lived sessions', text: '15-minute access tokens and rotating refresh tokens in an httpOnly cookie. Reuse of a stolen token signs the user out everywhere.' },
  { icon: MapPin, title: 'Built for teams across India', text: 'Indian rupee, GST on invoices, 12+ Indian languages, and India time zone throughout, for service teams in any city.' },
  { icon: Smartphone, title: 'Phone first for the field', text: 'Technicians work from a phone. The layout adapts from 360 px phones to wide desks.' },
]

export const FAQ = [
  { q: 'Can technicians use it on a phone?', a: 'Yes. The same app adapts to phone, tablet and desktop. A technician sees only their own jobs and can update status, tick the checklist and add parts and notes.' },
  { q: 'How does a customer follow a job?', a: 'Customers sign in, raise a request and watch the work order move through its stages. They receive updates as the status changes, pay the invoice and rate the visit.' },
  { q: 'Can two jobs be booked for one technician at the same time?', a: 'No. Assignment checks the technician’s calendar on the server and refuses an overlapping slot, even if two coordinators click at the same moment.' },
  { q: 'What happens when a job misses its deadline?', a: 'Each priority has a service-level deadline. A scheduled check flags overdue jobs and alerts the control desk.' },
  { q: 'Where does our data live?', a: 'In a PostgreSQL database you control (the reference setup uses Neon, or RDS on AWS), and every schema change is a versioned migration.' },
  { q: 'How do people sign in?', a: 'Registration verifies both the mobile number (SMS code) and the email address (a link) before the account exists. After that you sign in with your email and password; a sign-in stays valid for one day. Customers are active at once; technicians and managers are approved by an administrator; administrators are created by an existing administrator.' },
]

export const INTERESTS = ['Service requests and dispatch', 'Work orders and checklists', 'Inventory and invoicing', 'Reports and SLA tracking', 'Something else']
