import { BarChart3, CalendarDays, ClipboardList, Building2, Droplets, FileText, Inbox, MapPin, Package, Refrigerator, ShieldCheck, Smartphone, Snowflake, Sparkles, Users, Wrench, Zap, PlugZap, Wand2, MessageSquare, LayoutDashboard } from 'lucide-react'

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
  { icon: Package, name: 'Inventory Manager', text: 'Owns spare parts: add items, correct counts, restock and watch low-stock alerts, with no access to customers or invoices.' },
  { icon: Smartphone, name: 'Customer', text: 'Raise a request, follow the technician, pay the invoice and leave feedback.' },
]

export const TOUR = [
  { id: 'dashboard', label: 'Dashboard', img: '/shots/dashboard.jpg', title: 'The day at a glance', text: 'Open requests, active jobs, pending appointments and overdue work, with a trend chart and the latest requests underneath.' },
  { id: 'order', label: 'Work order', img: '/shots/work-order.jpg', title: 'One page per job', text: 'Customer, technician, schedule, timeline, checklist, parts and feedback in a single view, with only the next valid status offered.' },
]

export const PLATFORM = [
  { group: 'Front end', items: ['React 18 + TypeScript', 'Vite build', 'Responsive from 360 px', '14 languages incl. Urdu (RTL)'] },
  { group: 'Back end', items: ['Java 21', 'Spring Boot 3.3', 'Spring Security + JWT', 'REST + WebSocket (STOMP)'] },
  { group: 'Data and identity', items: ['PostgreSQL (Neon)', 'Flyway migrations', 'Firebase email verification', 'Audit log'] },
  { group: 'AI and delivery', items: ['Groq-hosted open models', 'Docker', 'Render + Vercel', 'GitHub auto-deploy'] },
]

export const TRUST = [
  { icon: ShieldCheck, title: 'Role-based access', text: 'Every request is checked on the server. A customer sees only their own records; an inventory manager sees only stock.' },
  { icon: Zap, title: 'Safe sign-in', text: 'Email-verified registration, hashed passwords, one-day sessions and a rotating httpOnly refresh cookie.' },
  { icon: MapPin, title: 'Built for teams across India', text: 'Indian rupee, GST on invoices, 14 languages, India time zone, for service teams in any city or state.' },
  { icon: Smartphone, title: 'Phone first for the field', text: 'Technicians check in, tick the checklist and add notes from a phone. The layout adapts from 360 px up.' },
]

export const USE_CASES = [
  { icon: Snowflake, title: 'AC and refrigeration service', flow: 'Customer reports “AC not cooling” → AI suggests type and priority → AC-skilled technician assigned → gas and capacitor deducted from stock → GST invoice → AMC reminder.', who: 'Split-AC dealers, chiller and cold-room service firms' },
  { icon: PlugZap, title: 'Electrical contractors', flow: 'Fault logged with priority → nearest free electrician booked on the calendar → safety checklist before closing → wire, MCB and switch parts tracked per job.', who: 'Home and commercial electricians, panel and wiring teams' },
  { icon: Droplets, title: 'Plumbing and water services', flow: 'Leak request with photos → urgent jobs jump the queue by SLA → pipes, valves and taps logged on the job → payment recorded on completion.', who: 'Plumbers, RO and water-tank service providers' },
  { icon: Refrigerator, title: 'Appliance repair centres', flow: 'Washing machine, fridge or microwave request → technician troubleshoots with AI help → spare part used and billed → customer rates the visit.', who: 'Brand service partners and multi-brand repair shops' },
  { icon: Building2, title: 'Facility maintenance and AMC', flow: 'Equipment register with serial, warranty and AMC dates → next-service alerts 30 days ahead → scheduled visits → history for every asset.', who: 'Housing societies, offices, hospitals, maintenance contractors' },
]

export const AI_FEATURES = [
  { icon: Wand2, title: 'Request triage', text: 'Reads the customer’s description and suggests the issue type and priority, so the desk spends seconds, not minutes.' },
  { icon: Users, title: 'Smart assignment', text: 'Recommends a technician by skill, rating, leave and the jobs already booked that day, and says why.' },
  { icon: Wrench, title: 'Technician assistant', text: 'Safe, step-by-step troubleshooting for the fault on the job, and a clean customer-ready summary of rough site notes.' },
  { icon: LayoutDashboard, title: 'Manager summary', text: 'One short read of the day: highlights, SLA risks and what to act on first.' },
  { icon: Package, title: 'Inventory advice', text: 'Ask what to reorder first and which categories are running low, in plain language.' },
  { icon: MessageSquare, title: 'Customer chat', text: 'Customers ask “where is my technician?” and get an answer from their own requests only.' },
]

export const AI_ROLE_NOTE = 'Every role has an AI Assistant button in the top bar with the features that fit their work. Answers are suggestions: people confirm before acting, and the AI key never reaches the browser.'

export const FAQ = [
  { q: 'Who is ServicePro for?', a: 'Service businesses that send technicians to customers: AC and refrigeration, electrical, plumbing, appliance repair and facility-maintenance or AMC companies, from a three-person team to a larger multi-city operation.' },
  { q: 'Can technicians use it on a phone?', a: 'Yes. The same app adapts to phone, tablet and desktop. A technician sees only their own jobs and can check in and out, tick the checklist and add parts and notes.' },
  { q: 'How does a customer follow a job?', a: 'Customers sign in, raise a request and watch the work order move through its stages. They get updates as the status changes, pay the invoice and rate the visit.' },
  { q: 'Is the AI safe to use on real jobs?', a: 'AI only suggests. Triage, assignment and troubleshooting advice are shown to a person who decides. Requests go through our server, so the key is never in the browser, and each person’s questions are rate-limited.' },
  { q: 'Can two jobs be booked for one technician at the same time?', a: 'No. Assignment checks the technician’s calendar on the server and refuses an overlapping slot, even if two coordinators click at the same moment.' },
  { q: 'What happens when a job misses its deadline?', a: 'Each priority has a service-level deadline. A scheduled check flags overdue jobs and alerts the control desk.' },
  { q: 'Where does our data live?', a: 'In a PostgreSQL database you control (the reference setup uses Neon), and every schema change is a versioned migration.' },
  { q: 'How do people sign in?', a: 'Registration verifies the email address with a link, and the person then sets a password. Customers are active at once; technicians, managers and inventory managers are approved by an administrator; administrators are created by an existing administrator.' },
]

export const INTERESTS = ['Service requests and dispatch', 'Work orders and checklists', 'Inventory and invoicing', 'Reports and SLA tracking', 'Something else']
