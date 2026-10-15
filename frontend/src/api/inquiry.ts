import { api, ApiError, Page } from './http'

export interface InquiryInput {
  name: string
  email: string
  company: string
  phone: string
  interest: string
  message: string
  /** honeypot: must stay empty */
  website: string
}

export interface Inquiry {
  id: number
  name: string
  email: string
  company?: string | null
  phone?: string | null
  interest?: string | null
  message: string
  createdAt: string
}

/** POST /api/public/inquiries (no sign-in needed). Resolves when the server has stored the message. */
export async function submitInquiry(i: InquiryInput): Promise<void> {
  await api('/public/inquiries', { method: 'POST', body: { ...i, company: i.company || null, phone: i.phone || '', interest: i.interest || null } })
}

export async function listInquiries(): Promise<Inquiry[]> {
  const p = await api<Page<Inquiry>>('/admin/inquiries', { query: { page: 0, size: 100 } })
  return p.content
}

export { ApiError }
