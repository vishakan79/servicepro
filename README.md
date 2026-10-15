# ServicePro (FieldServicely)

Field-service management: service requests, work orders, scheduling, live tracking, inventory, invoicing, reports.
Roles: admin, manager, technician, customer.

```
React (Vite, Vercel) ──/api (rewrite) + wss──▶ Spring Boot API (Render) ──▶ PostgreSQL (Neon, Flyway)
                                                      └─ verifies Firebase ID tokens (SMS + email link)
```

| Folder | What it is |
|---|---|
| `frontend/` | React 18 + TypeScript + Vite: public website, sign-in/register, the app |
| `backend/` | Java 21, Spring Boot 3.3, JWT, Flyway, STOMP/WebSocket |
| `docs/AUTH.md` | Registration and sign-in design, Firebase console checklist |
| `docs/DEPLOY-VERCEL-RENDER.md` | Neon + Render + Vercel deployment |
| `render.yaml` | Render Blueprint for the API |
| `deploy/ec2/` | Alternative: EC2 + Docker + Caddy |

**Sign-in:** register with a verified mobile number (Firebase SMS code) and email (Firebase link), then sign in with email + password; a sign-in lasts one day.
There are no demo accounts. The first admin comes from `BOOTSTRAP_ADMIN_*` settings. See `docs/AUTH.md`.

## Run on your computer
1. Put your database and first-admin details in `backend/config/application-local.yml` (git-ignored). Use a local PostgreSQL, or your Neon database
   (copy host, database, user, password from the Neon console). The API creates the tables on first start.
2. `cd backend && mvn spring-boot:run` (the default profile is `local`; `SPRING_PROFILES_ACTIVE=dev` uses a throw-away in-memory H2 instead).
3. `cd frontend && cp .env.example .env.local && npm install && npm run dev`, then open http://localhost:5173/login.
Or run `run-local.bat` / `run-local.sh`.

## Checks
`cd frontend && npx tsc --noEmit -p . && npm run build`; `cd backend && mvn verify` (needs Maven Central access).
