# ServicePro API

Java 21, Spring Boot 3.3, Spring Security (JWT), Spring Data JPA + Flyway on PostgreSQL, STOMP/WebSocket, ShedLock.

* Profiles: `local` (default; PostgreSQL from `config/application-local.yml` or `DB_*`), `dev` (in-memory H2), `prod` (Render/EC2; `DB_*`, `JWT_SECRET`, `CORS_ORIGINS`, `BOOTSTRAP_ADMIN_*`).
* Auth endpoints: `POST /api/auth/login`, `/register/start`, `/register`, `/refresh`, `/logout`, `GET /api/auth/me`. See `../docs/AUTH.md`.
* Schema lives in `src/main/resources/db/migration` (V1 to V3); `ddl-auto: validate` fails startup if entities drift from it.
* Build: `mvn -B verify`. The Docker image builds with `-Dmaven.test.skip=true`.
