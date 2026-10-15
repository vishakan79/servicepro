# Deploy: Neon (database) + Render (API) + Vercel (website)

Order: Neon, Render, Vercel, then two settings that point them at each other.

1. **Neon**: create a project, copy host, database, user and password (use the *direct* host, not the "-pooler" one). The API creates every table itself on first start (Flyway).
2. **Render**: New > Blueprint > this repo (`render.yaml`). Fill `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `BOOTSTRAP_ADMIN_*`, and `CORS_ORIGINS` (the Vercel URL).
   Check `https://<service>.onrender.com/actuator/health/readiness` says `UP`; the log shows `Created the first admin account`.
3. **Vercel**: import the repo, Root Directory `frontend`. In `frontend/vercel.json` the `/api` rewrite points at the Render host.
   Environment variables: the four `VITE_FIREBASE_*` values from `frontend/.env.example`, and `VITE_WS_URL=wss://<service>.onrender.com/ws`.
4. **Firebase**: add the Vercel domain to *Authorized domains*; enable Phone and Email link (see `AUTH.md`).
5. Open the Vercel URL, sign in as the bootstrap admin.

Render's free plan sleeps after 15 minutes: the first request afterwards can take about a minute and may time out once. Use the Starter plan for real users.
