import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

// Same-origin proxy to the Spring Boot API: no CORS, and the SameSite=Strict refresh cookie works as-is.
const target = process.env.API_PROXY ?? 'http://localhost:8080'

export default defineConfig({
  plugins: [react()],
  // Browser tests only (E2E_FAKE_FIREBASE=1): replace the real Firebase phone-OTP wrapper with tests/firebase.fake.ts.
  resolve: process.env.E2E_FAKE_FIREBASE
    ? { alias: [{ find: /^.*\/auth\/firebase$/, replacement: fileURLToPath(new URL('./tests/firebase.fake.ts', import.meta.url)) }] }
    : {},
  server: { port: 5173, proxy: { '/api': target, '/ws': { target, ws: true } } },
})
