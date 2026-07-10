@echo off
REM Local development launcher for AI Camp (Windows).
REM Default: SQLite — Docker optional.

setlocal EnableDelayedExpansion

cd /d "%~dp0"

echo [ai-camp] Checking runtime dependencies...
where node >NUL 2>&1
if errorlevel 1 (
  echo [fail] Node.js is not installed. Please install Node 18.18+.
  exit /b 1
)
where pnpm >NUL 2>&1
if errorlevel 1 (
  echo [warn] pnpm not found. Enabling via corepack...
  call corepack enable
  call corepack prepare pnpm@9.12.0 --activate
)

set "DC="
where docker >NUL 2>&1
if not errorlevel 1 (
  docker compose version >NUL 2>&1
  if errorlevel 1 (
    set "DC=docker-compose"
  ) else (
    set "DC=docker compose"
  )
)

if not exist ".env.local" (
  echo [ai-camp] Creating .env.local...
  copy /Y ".env.example" ".env.local" >NUL
  powershell -NoProfile -Command "(Get-Content .env.local) -replace '^ARK_API_KEY=.*','ARK_API_KEY=ark-122144da-3d4a-41d7-9b8b-8bffb454b6f8-49fe4' | Set-Content .env.local -Encoding UTF8"
  echo [ok] .env.local created (ARK_API_KEY injected for local dev).
) else (
  echo [ok] .env.local already exists.
)

REM Minimal env for conditional docker
for /f "usebackq tokens=*" %%A in (`findstr /B "DATABASE_URL=" .env.local 2^>NUL`) do set "%%A"

if not "%DC%"=="" (
  echo !DATABASE_URL! | findstr /B /I "postgresql" >NUL
  if not errorlevel 1 (
    echo [ai-camp] Starting PostgreSQL...
    call %DC% up -d postgres
    if errorlevel 1 echo [warn] docker compose failed (compose may omit Postgres).
  ) else (
      echo [warn] SQLite (!DATABASE_URL!) — skipping Docker Postgres.
  )
) else (
  echo [warn] Docker not in PATH — using SQLite only is fine.
)

echo [ai-camp] Installing dependencies...
call pnpm install
if errorlevel 1 exit /b 1

echo [ai-camp] Applying prisma schema and seeding...
call pnpm --filter @ai-camp/api exec prisma generate
call pnpm --filter @ai-camp/api exec prisma db push --accept-data-loss
call pnpm --filter @ai-camp/api db:seed

echo.
echo =====================================
echo  AI Camp dev servers starting!
echo  Web : http://localhost:3000
echo  API : http://localhost:3001/api
echo  Docs: http://localhost:3001/api/docs
echo.
echo  Demo accounts (password for all = 123456):
echo    admin / teacher1 / parent1 / alice / bob
echo =====================================
echo.

call pnpm dev
