#!/usr/bin/env bash
# ServicePro local run: Spring Boot (8080) + React (5173). Needs JDK 21+, Maven, Node 18+.
# First put your database (a local PostgreSQL or your Neon database) and your admin details in backend/config/application-local.yml
set -e
cd "$(dirname "$0")"
(cd backend && mvn spring-boot:run) &
[ -f frontend/.env.local ] || cp frontend/.env.example frontend/.env.local
cd frontend && npm install && npm run dev
