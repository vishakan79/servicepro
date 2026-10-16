import type { ConfirmationResult, RecaptchaVerifier } from 'firebase/auth'
import { FIREBASE } from '../api/config'

/** Firebase is loaded only when someone starts a verification, so the public website stays light. */
async function load() {
  if (!FIREBASE.apiKey || !FIREBASE.projectId) throw new Error('Mobile OTP is not configured (missing VITE_FIREBASE_* settings).')
  const [appMod, authMod] = await Promise.all([import('firebase/app'), import('firebase/auth')])
  const app = appMod.getApps().length ? appMod.getApp() : appMod.initializeApp(FIREBASE)
  return { authMod, auth: authMod.getAuth(app) }
}

let verifier: RecaptchaVerifier | null = null

const MESSAGES: Record<string, string> = {
  'auth/invalid-phone-number': 'That mobile number is not valid. Include the country code.',
  'auth/missing-phone-number': 'Enter your mobile number.',
  'auth/too-many-requests': 'Too many attempts. Please wait a few minutes and try again.',
  'auth/quota-exceeded': 'SMS limit reached for now. Try again later.',
  'auth/invalid-verification-code': 'That code is not correct.',
  'auth/code-expired': 'That code has expired. Request a new one.',
  'auth/captcha-check-failed': 'Security check failed. Refresh the page and try again.',
  'auth/operation-not-allowed': 'Phone sign-in is not enabled in Firebase (Authentication > Sign-in method > Phone).',
  'auth/unauthorized-domain': 'This website address is not in Firebase "Authorized domains".',
  'auth/billing-not-enabled': 'Firebase needs the Blaze plan to send real SMS. Use a Firebase test number meanwhile.',
  'auth/internal-error': 'Could not reach the SMS service. Check the connection and the Firebase settings, then try again.',
  'auth/network-request-failed': 'Network problem. Check your connection.',
  'auth/invalid-email': 'That email address is not valid.',
  'auth/invalid-action-code': 'This email link is no longer valid. Request a new one.',
  'auth/expired-action-code': 'This email link has expired. Request a new one.',
  'auth/argument-error': 'This email link is not valid. Request a new one.',
  'auth/operation-not-supported-in-this-environment': 'This browser cannot complete the verification.',
}

function friendly(e: unknown): Error {
  const code = (e as { code?: string })?.code
  return new Error((code && MESSAGES[code]) || (e instanceof Error ? e.message : 'Mobile verification failed'))
}

/** Sends the SMS code. `containerId` is an empty element that stays mounted (invisible reCAPTCHA). */
export async function sendPhoneCode(phone: string, containerId: string): Promise<ConfirmationResult> {
  const reset = () => {
    try { verifier?.clear() } catch { /* already cleared */ }
    verifier = null
    const host = document.getElementById(containerId)
    if (host) host.innerHTML = ''
  }
  const attempt = async (): Promise<ConfirmationResult> => {
    const { authMod, auth } = await load()
    reset()
    const host = document.getElementById(containerId)
    if (!host) throw new Error('Security check is not ready. Refresh the page and try again.')
    // A brand-new element every attempt: reCAPTCHA refuses to render twice into the same element.
    const slot = document.createElement('div')
    slot.id = `rc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    host.appendChild(slot)
    verifier = new authMod.RecaptchaVerifier(auth, slot, { size: 'invisible' })
    return await authMod.signInWithPhoneNumber(auth, phone, verifier)
  }
  try {
    try {
      return await attempt()
    } catch (e) {
      // A previous failed attempt can leave the widget half-registered; one clean retry fixes it.
      if (/already been rendered/i.test(e instanceof Error ? e.message : String(e))) {
        reset()
        return await attempt()
      }
      throw e
    }
  } catch (e) {
    reset()
    throw friendly(e)
  }
}

/** Confirms the SMS code and returns a fresh Firebase ID token for our server to verify. */
export async function confirmPhoneCode(result: ConfirmationResult, code: string): Promise<string> {
  try {
    const cred = await result.confirm(code)
    const token = await cred.user.getIdToken(true)
    const { authMod, auth } = await load()
    await authMod.signOut(auth) // our own session replaces Firebase's; do not keep two
    return token
  } catch (e) {
    throw friendly(e)
  }
}

const EMAIL_KEY = 'sp.emailForSignIn'
const remember = (email: string) => { try { localStorage.setItem(EMAIL_KEY, email) } catch { /* private mode: the person is asked to retype it */ } }
export const rememberedEmail = (): string => { try { return localStorage.getItem(EMAIL_KEY) ?? '' } catch { return '' } }

/** Emails a sign-in link from Firebase. Opening it in this browser lands back on `returnUrl`. */
export async function sendEmailLink(email: string, returnUrl: string): Promise<void> {
  try {
    const { authMod, auth } = await load()
    await authMod.sendSignInLinkToEmail(auth, email, { url: returnUrl, handleCodeInApp: true })
    remember(email)
  } catch (e) {
    throw friendly(e)
  }
}

/** True when the current address is a Firebase email sign-in link (cheap check first, so Firebase only loads when needed). */
export async function isEmailLink(): Promise<boolean> {
  if (!/[?&]oobCode=/.test(window.location.href)) return false
  try {
    const { authMod, auth } = await load()
    return authMod.isSignInWithEmailLink(auth, window.location.href)
  } catch {
    return false
  }
}

/** Finishes the email-link sign-in and returns a fresh Firebase ID token proving the mailbox, for our server to verify. */
export async function completeEmailLink(email: string): Promise<string> {
  try {
    const { authMod, auth } = await load()
    const cred = await authMod.signInWithEmailLink(auth, email, window.location.href)
    const token = await cred.user.getIdToken(true)
    await authMod.signOut(auth)
    return token
  } catch (e) {
    throw friendly(e)
  }
}
