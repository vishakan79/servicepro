/** Date, money and catalogue helpers shared by the screens. */
export const YEAR = new Date().getFullYear()

export const isoDate = (offset = 0) => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + offset)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
export const isoTime = (dayOffset: number, hour: number, min = 0) => {
  const d = new Date()
  d.setDate(d.getDate() + dayOffset)
  d.setHours(hour, min, 0, 0)
  return d.toISOString()
}
export const fmtDate = (iso: string) =>
  new Date(iso.length === 10 ? iso + 'T00:00:00' : iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
export const fmtDateTime = (iso: string) => {
  const d = new Date(iso)
  return `${fmtDate(iso)} ${d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`
}
export const fmtHour = (h: number) => {
  const hh = Math.floor(h)
  const m = Math.round((h - hh) * 60)
  const ap = hh >= 12 ? 'PM' : 'AM'
  const h12 = hh % 12 === 0 ? 12 : hh % 12
  return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ap}`
}
export const inr = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN')

export const ISSUE_TYPES = ['AC Not Cooling', 'Water Leakage', 'Electrical Issue', 'Appliance Repair', 'Installation', 'AC Maintenance', 'Plumbing']

export const SKILLS: Record<string, string[]> = {
  'AC Not Cooling': ['AC'],
  'AC Maintenance': ['AC'],
  'Water Leakage': ['Plumbing'],
  Plumbing: ['Plumbing'],
  'Electrical Issue': ['Electrical'],
  'Appliance Repair': ['Appliance', 'Electrical'],
  Installation: ['AC', 'Appliance'],
}

export const CHECKLISTS: Record<string, string[]> = {
  'AC Not Cooling': ['Inspect gas pressure', 'Check compressor and capacitor', 'Clean filters and coils', 'Test cooling output'],
  'AC Maintenance': ['Clean filters', 'Clean indoor and outdoor coils', 'Check gas level', 'Test thermostat'],
  'Water Leakage': ['Locate leak source', 'Isolate water supply', 'Replace faulty fittings', 'Pressure test'],
  Plumbing: ['Inspect pipework', 'Fix or replace fittings', 'Check water pressure', 'Clean up site'],
  'Electrical Issue': ['Isolate power', 'Test wiring and MCB', 'Replace faulty components', 'Safety test'],
  'Appliance Repair': ['Diagnose fault', 'Replace faulty part', 'Test full cycle', 'Customer walkthrough'],
  Installation: ['Verify site readiness', 'Mount and connect unit', 'Test operation', 'Customer walkthrough'],
}
