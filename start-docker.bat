@echo off
setlocal
cd /d "%~dp0"

where docker >NUL 2>&1
if errorlevel 1 (
  echo [fail] Docker not installed.
  exit /b 1
)

docker compose version >NUL 2>&1
if errorlevel 1 (set "DC=docker-compose") else (set "DC=docker compose")

if not exist ".env" (
  copy /Y ".env.example" ".env" >NUL
  echo [ok] Created .env from .env.example. Edit it to add your ARK_API_KEY.
)

echo [ai-camp] Building and starting all services...
%DC% --env-file .env up -d --build

echo.
echo =====================================
echo  AI Camp running via Docker!
echo  Web : http://localhost:3000
echo  API : http://localhost:3001/api
echo  Docs: http://localhost:3001/api/docs
echo  Demo accounts (pwd=123456): admin / teacher1 / parent1 / alice / bob
echo =====================================
