@echo off
title MediCare Launcher
echo =========================================================
echo  MediCare - Full-Stack Clinical Consultation Portal
echo =========================================================
echo.

echo [Step 1/3] Installing frontend and backend dependencies...
call npm run install:all
if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERROR] Dependency installation failed. Please check node/npm installation.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [Step 2/3] Initializing and Seeding PostgreSQL Database...
echo (Please make sure PostgreSQL is running and backend/.env configurations match)
call npm run seed
if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERROR] Database seeding failed. Please check your PostgreSQL status and credentials in backend/.env.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [Step 3/3] Starting development servers...
echo Frontend will be hosted on http://localhost:3000
echo Backend will be hosted on http://localhost:5000
echo.
call npm run dev

pause
