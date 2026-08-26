# INSTALLATION & DEPLOYMENT GUIDE

## System Requirements

- **Windows 10/11** (or macOS/Linux with PowerShell Core)
- **Node.js 18+** (download from nodejs.org)
- **npm 8+** (comes with Node.js)
- **Wi-Fi router** (for LAN connectivity)
- **Minimum specs**: Laptop with 4GB RAM, any modern processor

## Step-by-Step Setup

### 1. Verify Node.js Installation

```powershell
node --version
npm --version
```

Expected output: `v18.x.x` or higher, `8.x.x` or higher

### 2. Navigate to Project

```powershell
cd D:\COLLEGE
```

### 3. Backend Setup

```powershell
cd backend

# Install dependencies
npm install

# Generate Prisma client (if not done)
npx prisma generate

# Initialize and push schema to SQLite
npx prisma db push

# Seed 40 sample questions
node prisma/seed.js

# Start backend server
node src/server.js
```

**Expected output:**
```
Backend listening on 4000
```

Keep this terminal open. Backend is now running.

### 4. Frontend Setup (New PowerShell Window)

```powershell
cd D:\COLLEGE\frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

**Expected output:**
```
VITE v5.x.x  ready in xxx ms

➜  Local:   http://localhost:5173/
➜  network: http://xxx.xxx.xxx.xxx:5173/
```

Keep this terminal open. Frontend is now running.

### 5. Test Locally

#### Admin Dashboard
Open browser: `http://localhost:5173/admin`

You should see:
- Question list on the left
- Live leaderboard on the right
- Export buttons

#### Student Registration
Open browser (or phone): `http://localhost:5173/register`

Fill form:
- **Name**: Test Student
- **Register Number**: 12345
- **Department**: CSE
- **Year**: 2024
- **Section**: A

Click Register. You should see "Registered!" alert.

### 6. Test Quiz Flow

1. **Admin dashboard** → Click "Start" on any question
2. **Frontend console** → You'll see `question:start` event
3. **Leaderboard** → Should show timer counting down (15 seconds)
4. **Student register** → Open in another tab/phone, join with register number
5. **Leaderboard** → Should show participant count increase
6. **Click "Reveal Answer"** → Answer displays with explanation

## LAN Access (Multi-Device Testing)

### Find Your Laptop's IP Address

```powershell
ipconfig | findstr /R "IPv4"
```

Look for IPv4 Address like: `192.168.x.xxx`

### Access from Other Devices

**On participant's phone/laptop (same Wi-Fi):**

Open browser and go to:
```
http://YOUR_IP:5173/register
```

Example:
```
http://192.168.1.100:5173/register
```

### Firewall Configuration

If you can't access from other devices:

1. Open **Windows Defender Firewall**
2. Click **"Allow an app through firewall"**
3. Add **Node.js** to allowed apps (both Private and Public)
4. Or run as Administrator: `npm start`

## Production Build (Optional)

### Build Frontend for Deployment

```powershell
cd D:\COLLEGE\frontend

# Build optimized production bundle
npm run build

# Output: frontend/dist/ folder
```

### Serve Production Bundle

```powershell
cd D:\COLLEGE\frontend

# Install http-server
npm install -g http-server

# Serve dist folder
http-server dist -p 3000
```

Then access: `http://localhost:3000` or `http://YOUR_IP:3000`

## Environment Configuration

### Backend .env

`D:\COLLEGE\backend\.env`

```
PORT=4000
ADMIN_USER=admin
ADMIN_PASS=password
ADMIN_SECRET=your_secret_key_here
DATABASE_URL="file:./dev.db"
```

Change these values before production use.

### Frontend Configuration

Frontend API calls default to `http://localhost:4000`. 

To change for production, edit:
- `frontend/src/pages/AdminDashboard.jsx` line 1
- `frontend/src/pages/StudentRegister.jsx` line 7
- `frontend/src/utils/socket.js` line 2

Replace `http://localhost:4000` with your production backend URL.

## Database Management

### Reset Database

If you want to start fresh:

```powershell
cd D:\COLLEGE\backend

# Delete the SQLite file
Remove-Item dev.db

# Recreate schema
npx prisma db push

# Re-seed questions
node prisma/seed.js
```

### View Database

Using Prisma Studio:

```powershell
cd D:\COLLEGE\backend
npx prisma studio
```

Opens web UI at `http://localhost:5555`

## Troubleshooting

### "Cannot find module 'express'"
**Solution:**
```powershell
cd D:\COLLEGE\backend
npm install
```

### "Port 4000 already in use"
**Solution 1:** Change port in `backend/.env`
```
PORT=5000
```

**Solution 2:** Kill process using port
```powershell
netstat -ano | findstr :4000
taskkill /PID <PID> /F
```

### "Socket connection failed"
**Solution:**
- Ensure backend is running: `node src/server.js`
- Check firewall allows port 4000
- Verify you're on same Wi-Fi network

### "Prisma error: Database does not exist"
**Solution:**
```powershell
npx prisma db push --skip-generate
```

### "npm ERR! code ENOENT"
**Solution:**
- Ensure you're in correct folder
- Run `npm install` again
- Delete `node_modules` and `package-lock.json`, reinstall

## Performance Optimization

### For Many Participants (50+)

1. **Increase Node.js memory**:
```powershell
$env:NODE_OPTIONS = "--max-old-space-size=2048"
node src/server.js
```

2. **Use production database** (PostgreSQL instead of SQLite):
   - Edit `backend/prisma/schema.prisma`
   - Change provider to "postgresql"
   - Update `.env` with connection string

3. **Enable gzip compression** (already in express setup)

## Monitoring & Logs

### Backend Console Output

The backend prints:
- Socket connections/disconnections
- Student registrations
- Quiz events
- Database queries (debug mode)

Enable debug logging:
```powershell
$env:DEBUG = "socket.io:*"
node src/server.js
```

### Frontend Console

Open browser DevTools (F12):
- **Console tab** → See socket events
- **Network tab** → API calls and responses
- **Application tab** → LocalStorage data

## Data Export After Quiz

### Download Results

1. Go to Admin Dashboard
2. Click **"Show Exports"**
3. Choose format:
   - **CSV** → Open in Excel/Sheets
   - **XLSX** → Open in Excel
   - **PDF** → Generate certificate per student

### Backup Database

```powershell
cd D:\COLLEGE\backend
copy dev.db "dev_backup_$(Get-Date -Format 'yyyy-MM-dd_HH-mm').db"
```

## Cleanup & Shutdown

### Stop Services

- Press `Ctrl + C` in backend terminal
- Press `Ctrl + C` in frontend terminal

### Clean Files (if reinstalling)

```powershell
cd D:\COLLEGE

# Backend
cd backend
Remove-Item node_modules -Recurse -Force
Remove-Item package-lock.json

# Frontend
cd ..\frontend
Remove-Item node_modules -Recurse -Force
Remove-Item package-lock.json
```

Then reinstall: `npm install` in each folder

## Support & Debugging

For issues:
1. Check `docs/FEATURES.md` for implementation details
2. Review socket events in `docs/SOCKET_EVENTS.md`
3. Check console output in both backend & frontend
4. Read error messages carefully (they're descriptive)

---

**Happy Quizzing!** 🎓🚀
