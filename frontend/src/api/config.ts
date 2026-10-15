/** Empty = same origin (Vercel rewrites /api/* to the backend, so the SameSite=Strict refresh cookie keeps working). */
export const API_BASE: string = import.meta.env.VITE_API_BASE ?? ''

/**
 * WebSocket endpoint. Vercel cannot proxy WebSockets, so in production this points straight at the API host
 * (wss://api.example.com/ws). Empty = same origin, which is what the Vite dev proxy provides.
 */
export const WS_URL: string = import.meta.env.VITE_WS_URL ?? ''

/** 'hash' for static hosts without rewrite support (the shareable demo); 'browser' (clean URLs) everywhere else. */
export const HASH_ROUTER = import.meta.env.VITE_ROUTER === 'hash'

/**
 * Firebase web config (phone OTP). These values are identifiers, not secrets: security comes from the authorized domains
 * and API-key restrictions set in the Firebase / Google Cloud console, and from the server verifying every ID token.
 */
export const FIREBASE = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? '',
}
