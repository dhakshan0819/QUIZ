#!/bin/bash

# Install dependencies and start both backend, frontend, and tunnel concurrently

if [ ! -d "backend/node_modules" ]; then
  echo "Installing backend dependencies..."
  (cd backend && npm install)
else
  echo "Backend dependencies already installed, skipping npm install..."
fi

if [ ! -d "frontend/node_modules" ]; then
  echo "Installing frontend dependencies..."
  (cd frontend && npm install)
else
  echo "Frontend dependencies already installed, skipping npm install..."
fi

echo "Generating Prisma client and preparing database..."
(cd backend && npx prisma generate && npx prisma db push --skip-generate && node prisma/seed.js)

echo "Starting both servers..."
(cd backend && node src/server.js) &
BACKEND_PID=$!

(cd frontend && npm run dev) &
FRONTEND_PID=$!

echo "Generating QR Code for LAN hosting..."
python3 qr.py

# Retrieve the LAN IP dynamically for the console output
LAN_IP=$(python3 -c "import socket; s=socket.socket(socket.AF_INET, socket.SOCK_DGRAM); s.connect(('10.254.254.254', 1)); print(s.getsockname()[0])" 2>/dev/null)
if [ -z "$LAN_IP" ]; then
  LAN_IP=$(hostname -I | awk '{print $1}')
fi
if [ -z "$LAN_IP" ]; then
  LAN_IP="localhost"
fi

echo "==========================================================="
echo " CYBER QUIZ ARENA IS LIVE ON THE LOCAL NETWORK (LAN)!"
echo " Participants Register URL: http://$LAN_IP:5173/register"
echo " Live Leaderboard URL:       http://$LAN_IP:5173/leaderboard"
echo " Admin Dashboard URL:        http://$LAN_IP:5173/admin"
echo "==========================================================="

# Handle graceful shutdown
trap "kill $BACKEND_PID $FRONTEND_PID" SIGINT SIGTERM EXIT

echo "Backend and Frontend are running on LAN. Press Ctrl+C to stop."
wait

