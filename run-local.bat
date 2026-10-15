@echo off
REM ServicePro local run: Spring Boot (8080) + React (5173). Needs JDK 21+, Maven, Node 18+.
REM First put your database (a local PostgreSQL or your Neon database) and your admin details in backend\config\application-local.yml
cd /d "%~dp0"
start "ServicePro API" cmd /k "cd backend && mvn spring-boot:run"
if not exist frontend\.env.local copy frontend\.env.example frontend\.env.local
start "ServicePro Web" cmd /k "cd frontend && npm install && npm run dev"
echo.
echo The API window should print "DATABASE: jdbc:postgresql://..." and "Created the first admin account".
echo Open http://localhost:5173/login
