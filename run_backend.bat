@echo off
cd backend
if not exist node_modules (
    echo Installing backend dependencies...
    call npm install
) else (
    echo Backend dependencies already installed, skipping npm install...
)
echo.
echo Generating Prisma client...
call npx prisma generate
echo.
echo Pushing Prisma schema to SQLite...
call npx prisma db push --skip-generate
echo.
echo Seeding database with sample questions...
call node prisma/seed.js
echo.
echo Starting backend server...
call node src/server.js
