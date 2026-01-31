@echo off
REM UE-Bot Gateway Startup Script for Windows
REM Run Moltbot/OpenClaw Gateway with Groq configuration

setlocal enabledelayedexpansion

set SCRIPT_DIR=%~dp0
set MOLTBOT_DIR=%SCRIPT_DIR%..\external\moltbot
set GATEWAY_PORT=18789

echo.
echo ===================================
echo   UE-Bot Gateway Startup (Windows)
echo ===================================
echo.

REM Check if Moltbot directory exists
if not exist "%MOLTBOT_DIR%" (
    echo [ERROR] Moltbot directory not found: %MOLTBOT_DIR%
    exit /b 1
)

REM Check if dependencies are installed
if not exist "%MOLTBOT_DIR%\node_modules" (
    echo [INFO] Installing dependencies...
    cd /d "%MOLTBOT_DIR%"
    call pnpm install
)

REM Check if build exists
if not exist "%MOLTBOT_DIR%\dist\entry.js" (
    echo [INFO] Building Moltbot...
    cd /d "%MOLTBOT_DIR%"
    call pnpm build
)

echo [INFO] Starting Gateway on port %GATEWAY_PORT%...
cd /d "%MOLTBOT_DIR%"

REM Run gateway
node dist/entry.js gateway %*
