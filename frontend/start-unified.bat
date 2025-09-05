@echo off
echo ========================================
echo    UniSafe Unified Development Setup
echo ========================================
echo.

echo Step 1: Copying environment configuration...
if not exist .env (
    copy env-config.txt .env
    echo ✅ Created .env file from template
) else (
    echo ✅ .env file already exists
)

echo.
echo Step 2: Installing dependencies...
call npm install

echo.
echo Step 3: Starting backend server...
start "UniSafe Backend" cmd /k "cd backend && node server.js"

echo.
echo Waiting 3 seconds for backend to start...
timeout /t 3 /nobreak > nul

echo.
echo Step 4: Starting frontend...
start "UniSafe Frontend" cmd /k "npm start"

echo.
echo ========================================
echo    Development Environment Started!
echo ========================================
echo.
echo Backend: http://localhost:5000
echo Frontend: http://localhost:19006
echo API Test: Open test-api.html in browser
echo.
echo Press any key to exit...
pause > nul
