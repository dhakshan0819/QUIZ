#!/bin/bash

# Navigate to the backend directory
cd backend || exit

if [ ! -d "node_modules" ]; then
  echo "Installing backend dependencies..."
  npm install
else
  echo "Backend dependencies already installed, skipping npm install..."
fi

echo ""
echo "Generating Prisma client..."
npx prisma generate

echo ""
echo "Pushing Prisma schema to SQLite..."
npx prisma db push --skip-generate

echo ""
echo "Seeding database with sample questions..."
node prisma/seed.js

echo ""
echo "Starting backend server..."
node src/server.js
