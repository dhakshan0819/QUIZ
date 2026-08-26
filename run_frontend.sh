#!/bin/bash

# Navigate to the frontend directory
cd frontend || exit

if [ ! -d "node_modules" ]; then
  echo "Installing frontend dependencies..."
  npm install
else
  echo "Frontend dependencies already installed, skipping npm install..."
fi

echo ""
echo "Starting Vite dev server..."
npm run dev
