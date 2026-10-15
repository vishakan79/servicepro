# Registration and sign-in

There is no Google/Microsoft sign-in and no demo account. Sign-in is **email + password**, valid for **one day** (access token 24 h, refresh cookie 24 h).

## Registering
1. The person fills in role, name, email, mobile (and address for customers). The API checks the email and mobile are free.
2. **Email proof:** Firebase emails a sign-in link (`sendSignInLinkToEmail`). Opening it in the same browser proves the mailbox.
   Firebase does not offer "email a code", so this step is a link, not a 6-digit code.
3. **Mobile proof:** Firebase sends an SMS code; the person types it.
4. The person chooses a password (8-72 chars, a letter and a digit). The browser sends the details, the password and **both Firebase ID tokens**.
5. The API verifies each token (RS256 signature against Google's keys, issuer, audience = our project, expiry, provider, `auth_time` freshness),
   checks the verified phone/email equal what was typed, and stores only a BCrypt hash of the password.
6. The person then signs in with email and password.

| Role | Becomes active |
|---|---|
| Customer | Immediately after both proofs |
| Technician, Manager | After an admin clicks **Approve** (Users & Roles) |
| Admin | Never self-registered. First admin comes from `BOOTSTRAP_ADMIN_EMAIL`, `_PHONE`, `_PASSWORD`; later admins are added by an admin |

## Protections
* Failed sign-ins are limited per client address + email; unknown email and wrong password give the same message and take similar time.
* Disabled or unapproved accounts are told so only after the correct password (no account discovery).
* Admin can never be self-registered; disabling a user revokes their sessions.
* Access token is kept in memory only; the httpOnly SameSite=Strict refresh cookie rotates on every use and reuse revokes all sessions.
* Production refuses to start without a strong `JWT_SECRET` and a Firebase project id.

## Firebase console checklist (project `servicepro-ad08e`)
1. Authentication > Sign-in method > **Phone**: enable.
2. Authentication > Sign-in method > **Email/Password**: enable, and turn on **Email link (passwordless sign-in)**.
3. Authentication > Settings > **Authorized domains**: add `localhost` and your Vercel domain.
4. Optional for testing: Phone > "Phone numbers for testing" lets you use a fixed number and code without sending SMS.
5. Real SMS to Indian numbers may need the Blaze (pay-as-you-go) plan; Firebase shows `auth/billing-not-enabled` otherwise.
6. Restrict the browser API key to HTTP referrers (your Vercel domain, `localhost:5173/*`).
7. Firebase's default email sender is `noreply@servicepro-ad08e.firebaseapp.com`; its template can be edited under Authentication > Templates.

Forgot password: not built yet. An administrator can add the person again after disabling the old account, or reset by database access.
