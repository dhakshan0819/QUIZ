# QUICK START (5 MINUTES)

## Step 1: Start Backend Server

```powershell
cd D:\COLLEGE
.\run_backend.bat
```

**Expected Output:**
```
Backend listening on port 4000
Socket.IO server ready
Database connected ✓
```

Leave this window open.

---

## Step 2: Start Frontend Server (New Terminal)

```powershell
cd D:\COLLEGE
.\run_frontend.bat
```

**Expected Output:**
```
VITE v4.x.x  ready in XXX ms

➜  Local:   http://localhost:5173/
➜  press h to show help
```

---

## Step 3: Access Platforms

### Admin Dashboard
```
http://localhost:5173/admin
```

**Login:**
- Username: `admin`
- Password: `password`

### Student Registration (Local)
```
http://localhost:5173/register
```

### Student Registration (LAN/Other Devices)
```
http://<YOUR_COMPUTER_IP>:5173/register
```

**Find your IP:**
```powershell
ipconfig | findstr IPv4
```

Look for `IPv4 Address . . . . . . . . . . : 192.168.x.x`

---

## Step 4: Run Quiz

1. **Admin Dashboard** → Select a question → Click "Start Question"
2. **Students** → Answer within 15 seconds
3. **Admin** → Click "Reveal Answer" to show correct answer
4. **Leaderboard** → Updates automatically with scores

---

## Step 5: Export Results

**Admin Dashboard:**
- **Download CSV** → Opens results.csv in Excel
- **Download XLSX** → Opens results.xlsx (formatted)
- **Download Certificate** → Select student, gets PDF

---

## 📱 LAN Access (Share with Students)

1. Find your IP: `ipconfig | findstr IPv4`
2. Share link: `http://192.168.x.x:5173/register`
3. Students join same Wi-Fi, open link
4. Students register and participate

**Make sure**: Firewall allows ports 4000 and 5173

---

## 🔧 Troubleshooting

| Issue | Solution |
|-------|----------|
| "Port 4000 already in use" | Close other backend instance or use new port in .env |
| "Cannot connect to database" | Run `.\run_backend.bat` again to seed database |
| "Students can't connect" | Check firewall, ensure same Wi-Fi, verify IP address |
| "Export button not working" | Check backend console for errors; restart backend |
| "No questions showing" | Backend may not be running; check port 4000 is active |

---

## 📚 Full Documentation

- **INSTALLATION.md** - Detailed setup & advanced config
- **docs/FEATURES.md** - Complete feature list & architecture
- **docs/SOCKET_EVENTS.md** - Socket API reference
- **README.md** - Project overview

---

## ✅ You're Ready!

Backend running ✓  
Frontend running ✓  
Database seeded ✓  
Admin logged in ✓  

**Go to**: `http://localhost:5173/admin` and start your first quiz!

Enjoy the Cyber Quiz Arena! 🚀
