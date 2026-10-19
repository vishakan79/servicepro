import { api } from './http'

export type AiTask = 'TRIAGE' | 'ASSIST' | 'NOTE_SUMMARY' | 'NOTE_IMPROVE' | 'ASSIGN' | 'REPORT_SUMMARY' | 'CHAT' | 'ROLE_ASSIST'

/** Runs one AI task on the server (the Groq key stays there) and returns the answer text. */
export async function aiRun(task: AiTask, input: unknown): Promise<string> {
  const text = typeof input === 'string' ? input : JSON.stringify(input)
  const r = await api<{ text: string }>('/ai/run', { method: 'POST', body: { task, input: text.slice(0, 9000) } })
  return r.text
}

/** For the tasks that answer with JSON (TRIAGE, ASSIGN). */
export async function aiJson<T>(task: AiTask, input: unknown): Promise<T> {
  const raw = await aiRun(task, input)
  try { return JSON.parse(raw) as T } catch { throw new Error('The AI answered in an unexpected format. Try again.') }
}

export const aiMessage = (e: unknown) => (e instanceof Error ? e.message : 'AI is not available right now')
