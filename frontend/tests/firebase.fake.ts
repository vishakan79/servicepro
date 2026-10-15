// E2E ONLY. vite.config.ts swaps src/auth/firebase.ts for this file when E2E_FAKE_FIREBASE=1, so browser tests can
// run without Google's SMS/e-mail. The correct "SMS code" is 654321. An email link is simulated by opening
// /register?oobCode=fake (the draft saved before the link was "sent" supplies the email address).
import type { ConfirmationResult } from 'firebase/auth'

export const rememberedEmail = (): string => { try { return localStorage.getItem('sp.emailForSignIn') ?? '' } catch { return '' } }

export async function sendEmailLink(email: string): Promise<void> {
  if (email.startsWith('fail@')) throw new Error('Too many attempts. Please wait a few minutes and try again.')
  localStorage.setItem('sp.emailForSignIn', email)
}
export async function isEmailLink(): Promise<boolean> { return /[?&]oobCode=fake/.test(window.location.href) }
export async function completeEmailLink(email: string): Promise<string> { return 'fake-email-token:' + email.toLowerCase() }

export async function sendPhoneCode(phone: string): Promise<ConfirmationResult> {
  if (phone.endsWith('0000')) throw new Error('SMS limit reached for now. Try again later.')
  return {
    verificationId: 'fake',
    confirm: async (code: string) => {
      if (code !== '654321') throw Object.assign(new Error('x'), { code: 'auth/invalid-verification-code' })
      return { user: { phone } }
    },
  } as unknown as ConfirmationResult
}

export async function confirmPhoneCode(result: ConfirmationResult, code: string): Promise<string> {
  try {
    const cred = (await result.confirm(code)) as unknown as { user: { phone: string } }
    return 'fake-token:' + cred.user.phone
  } catch {
    throw new Error('That code is not correct.')
  }
}
