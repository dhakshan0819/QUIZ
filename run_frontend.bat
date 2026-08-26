@echo off
cd frontend
if not exist node_modules (
    echo Installing frontend dependencies...
    call npm install
) else (
    echo Frontend dependencies already installed, skipping npm install...
)
echo.
echo Starting Vite dev server...
call npm run dev
