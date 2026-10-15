# ServicePro frontend (React 18 + TypeScript + Vite)

## Architecture

```
src/
  main.tsx            providers: ErrorBoundary > Router > Auth > Store
  App.tsx             route table, role guards, lazy-loaded pages (code splitting)
  api/
    config.ts         build-time env: USE_API, API_BASE, WS_URL, HASH_ROUTER
    http.ts           fetch client: in-memory access token, single-flight refresh, ApiError
    mappers.ts        backend DTO -> UI types (the only place that knows DTO shapes)
    store.tsx         Store contract + in-memory demo implementation
    ApiStoreProvider  same contract over REST + STOMP live updates
    mock.ts           demo data
  auth/               AuthContext (mock or API session), RequireRole
  components/         Layout, ui atoms, ErrorBoundary
  pages/              one file per screen
  styles/             global.css, pages.css, theme.css (Madras design tokens)
```

Pages depend only on `useStore()` / `useAuth()`, so demo and API mode share every screen.

## Run

```bash
npm ci
npm run dev                      # demo mode, no backend
VITE_USE_API=true npm run dev    # real API via Vite proxy (/api, /ws -> localhost:8080)
npm run build && npm run preview
```

## Deploy on Vercel

Vercel serves the static build and rewrites `/api/*` to your backend, so the browser only ever talks to one origin. That keeps the `SameSite=Strict` httpOnly refresh cookie working with no CORS.

1. Edit `vercel.json`: replace `https://api.example.com` with your API origin (the ALB / API domain).
2. Import the repo in Vercel, set **Root Directory** to `frontend`. Framework preset: Vite.
3. Environment variables (Production):
   - `VITE_USE_API=true`
   - `VITE_WS_URL=wss://api.example.com/ws` (Vercel cannot proxy WebSockets, so the browser connects to the API directly)
4. Backend env: `CORS_ORIGINS=https://<your-app>.vercel.app,https://<custom-domain>`. This is needed for the WebSocket handshake origin check.
5. Deploy. Preview deployments get their own URL; add it to `CORS_ORIGINS` only if you need live updates there.

Checklist: HTTPS on the API (cookies are `Secure` in prod), the API domain matches the `vercel.json` rewrite, and `/api/auth/refresh` returns 401 (not an HTML page) when called without a cookie.

## Scripts

| Script | Purpose |
|---|---|
| `npm run build` | typecheck + production build |
| `npm run build:demo` | same with hash routing, for static hosts without rewrites |
| `npm run typecheck` | `tsc` only |

## Walkthrough voice-over (English + Tamil)

The Walkthrough section on the home page shows captions and can read each chapter aloud. By default it uses the browser's built-in voice (quality varies; some devices have no Tamil voice). For a consistent voice:

1. Create a Google Cloud API key with the **Cloud Text-to-Speech API** enabled.
2. `set GOOGLE_TTS_KEY=<key>` (Windows) or `export GOOGLE_TTS_KEY=<key>` (Mac/Linux), then in this folder run `node tools/make-voice.mjs`.
3. It writes `public/audio/en-1.mp3 ... ta-8.mp3`. Restart the dev server; the site uses these clips automatically. Do not commit or share the API key.

To change the words, edit `src/site/narration.json` and run the script again. Only stock synthetic voices or voices you have recorded or licensed should be used.
