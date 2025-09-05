@echo off
echo Starting UniSafe Development Environment...
echo.

echo Installing dependencies...
call npm install

echo.
echo Starting backend server...
start "Backend Server" cmd /k "npm run backend:dev"

echo.
echo Waiting 3 seconds for backend to start...
timeout /t 3 /nobreak > nul

echo.
echo Starting frontend...
start "Frontend" cmd /k "npm start"

echo.
echo Development environment started!
echo Backend: http://localhost:5000
echo Frontend: http://localhost:19006
echo.
pause
