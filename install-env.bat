@echo off
REM AI Camp 环境安装脚本 (Windows)
REM 仅完成依赖检查、环境配置与数据库初始化，不启动开发服务器。
REM 安装完成后请运行: start-dev.bat

setlocal EnableDelayedExpansion

cd /d "%~dp0"

echo.
echo ========================================
echo   AI Camp 环境安装 (Windows)
echo ========================================
echo.

REM --- 1. Node.js ---
echo [install] 检查 Node.js...
where node >NUL 2>&1
if errorlevel 1 (
  echo [fail] 未检测到 Node.js。请先安装 Node 18.18+：https://nodejs.org
  exit /b 1
)
for /f "tokens=1 delims=." %%a in ('node -p "process.versions.node"') do set NODE_MAJOR=%%a
if %NODE_MAJOR% LSS 18 (
  echo [fail] Node 版本过低，需要 ^>= 18.18.0
  exit /b 1
)
for /f "delims=" %%v in ('node -v') do echo [ok] Node.js %%v

REM --- 2. pnpm ---
echo [install] 检查 pnpm...
where pnpm >NUL 2>&1
if errorlevel 1 (
  echo [warn] 未找到 pnpm，正在通过 corepack 安装...
  call corepack enable
  call corepack prepare pnpm@9.12.0 --activate
  if errorlevel 1 (
    echo [fail] pnpm 安装失败，请手动执行: corepack enable ^&^& corepack prepare pnpm@9.12.0 --activate
    exit /b 1
  )
)
for /f "delims=" %%v in ('pnpm -v') do echo [ok] pnpm %%v

REM --- 3. Docker (可选) ---
set "DC="
where docker >NUL 2>&1
if not errorlevel 1 (
  docker compose version >NUL 2>&1
  if errorlevel 1 (
    set "DC=docker-compose"
    echo [ok] docker-compose 已就绪
  ) else (
    set "DC=docker compose"
    echo [ok] Docker Compose 已就绪
  )
) else (
  echo [warn] 未检测到 Docker。默认使用 SQLite，本地演示不受影响。
  echo         如需 PostgreSQL，请安装 Docker Desktop: https://www.docker.com
)

REM --- 4. .env.local ---
if not exist ".env.local" (
  echo [install] 从 .env.example 创建 .env.local...
  copy /Y ".env.example" ".env.local" >NUL
  powershell -NoProfile -Command "(Get-Content .env.local) -replace '^ARK_API_KEY=.*','ARK_API_KEY=ark-122144da-3d4a-41d7-9b8b-8bffb454b6f8-49fe4' | Set-Content .env.local -Encoding UTF8"
  echo [ok] 已创建 .env.local（已写入本地开发用 ARK_API_KEY）
) else (
  echo [ok] .env.local 已存在，保持不变
)

for /f "usebackq tokens=*" %%A in (`findstr /B "DATABASE_URL=" .env.local 2^>NUL`) do set "%%A"

REM --- 5. Docker Postgres ---
if not "%DC%"=="" (
  echo !DATABASE_URL! | findstr /B /I "postgresql" >NUL
  if not errorlevel 1 (
    echo [install] 启动 PostgreSQL 容器...
    call %DC% up -d postgres
    if errorlevel 1 echo [warn] PostgreSQL 容器启动失败，请检查 docker-compose.yml
  ) else (
    echo [warn] 使用 SQLite（!DATABASE_URL!），跳过 Postgres 容器
  )
)

REM --- 6. 安装依赖 ---
echo [install] 安装 pnpm 工作区依赖（首次可能需数分钟）...
call pnpm install
if errorlevel 1 (
  echo [fail] 依赖安装失败
  exit /b 1
)
echo [ok] 依赖安装完成

REM --- 7. 数据库 ---
echo [install] 初始化数据库（prisma generate + db push + seed）...
call pnpm --filter @ai-camp/api exec prisma generate
if errorlevel 1 exit /b 1
call pnpm --filter @ai-camp/api exec prisma db push --accept-data-loss
if errorlevel 1 exit /b 1
call pnpm --filter @ai-camp/api db:seed
if errorlevel 1 echo [warn] 种子数据脚本有告警（可继续）
echo [ok] 数据库就绪

echo.
echo ========================================
echo   环境安装完成！
echo ========================================
echo.
echo   下一步：启动开发服务器
echo     start-dev.bat
echo.
echo   或手动启动：
echo     pnpm dev
echo.
echo   访问地址：
echo     Web  : http://localhost:3000
echo     API  : http://localhost:3001/api
echo     Docs : http://localhost:3001/api/docs
echo.
echo   演示账号（密码均为 123456）：
echo     admin / teacher1 / parent1 / alice / bob
echo.

endlocal
