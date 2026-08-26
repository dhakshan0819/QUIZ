# Cyber Quiz Arena

**Production-ready LAN-based Cyber Security Quiz Platform**

A complete full-stack web application for conducting Cyber Security quizzes completely offline over a Local Area Network (LAN). Perfect for college events, competitions, and training sessions.

## Features

✅ **Real-time Socket.IO Communication** — Live updates on all devices  
✅ **40 Easy-to-Hard Questions** — Cyber Security, Networks, Fundamentals, Hacking  
✅ **Admin Dashboard** — Full control: start questions, reveal answers, manage leaderboard  
✅ **Student Registration** — Secure student registration with duplicate prevention  
✅ **Live Leaderboard** — Real-time ranking and scoring  
✅ **Export Results** — CSV, XLSX downloads  
✅ **PDF Certificates** — Auto-generate participation certificates  
✅ **Glassmorphism UI** — Modern cyberpunk design with animations  
✅ **Framer Motion Animations** — Smooth, professional transitions  
✅ **LAN-Ready** — Zero internet required, works on local Wi-Fi  
✅ **Anti-Cheat** — One login per register number, auto-lock answers  

## Tech Stack

**Backend**
- Node.js + Express.js
- Socket.IO (real-time events)
- Prisma ORM + SQLite
- JWT Authentication
- PDFKit + ExcelJS (exports)

**Frontend**
- React 18 + Vite
- Tailwind CSS
- Framer Motion
- React Router
- Socket.IO Client
- React Hook Form

## Quick Start

### 1. Backend Setup (PowerShell)

```powershell
cd D:\COLLEGE\backend
npm install
copy .env.example .env
# (optional) Edit .env for admin credentials
npx prisma generate
npx prisma db push
node prisma/seed.js
node src/server.js
```

Backend runs on: `http://localhost:4000`

### 2. Frontend Setup (New PowerShell Window)

```powershell
cd D:\COLLEGE\frontend
npm install
npm run dev
```

Frontend dev server runs on: `http://localhost:5173` or `http://<YOUR_IP>:5173`

### 3. Quick Test

- **Admin:** http://localhost:5173/admin (username: `admin`, password: `password`)
- **Student:** http://localhost:5173/register

## LAN Access (for participants)

Find your laptop's local IP:
```powershell
ipconfig | findstr /R "IPv4"
```

Share with participants:
- **Student Registration:** `http://<YOUR_IP>:5173/register`
- **Admin Link:** `http://<YOUR_IP>:5173/admin`

All devices must be on the same Wi-Fi network (no internet needed).

## Project Structure

```
D:\COLLEGE
├── backend/
│   ├── src/
│   │   ├── server.js          (Express + Socket.IO)
│   │   ├── socket.js          (Real-time events)
│   │   ├── db.js              (Prisma client)
│   │   ├── routes/
│   │   │   ├── auth.js        (Admin login)
│   │   │   ├── students.js    (Registration, list)
│   │   │   └── exports.js     (CSV, XLSX, PDF certificates)
│   │   └── utils/
│   │       ├── certificate.js (PDF generation)
│   │       └── qrgen.js       (QR codes)
│   ├── prisma/
│   │   ├── schema.prisma      (Database schema)
│   │   └── seed.js            (Sample data)
│   ├── sample_questions.json  (40 questions)
│   ├── .env                   (Configuration)
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── StudentRegister.jsx
│   │   │   └── AdminDashboard.jsx
│   │   ├── components/
│   │   ├── utils/socket.js
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.cjs
│   └── package.json
├── docs/
│   ├── LAN_HOSTING.md
│   └── SOCKET_EVENTS.md
├── run_backend.bat
├── run_frontend.bat
└── README.md
```

## Admin Controls

- **Start Question** — Broadcast question to all students
- **Reveal Answer** — Show correct answer + explanation
- **Live Leaderboard** — Top 10 ranked students
- **Export Results** — Download CSV or XLSX
- **Pause/Resume** — Control quiz flow

## Student Interface

- **Register** — Name, ID, Department, Year, Section
- **Quiz Lobby** — Wait for quiz to start
- **Answer Questions** — 15-second countdown per question
- **View Results** — Final score and rank

## Database Schema

**Students**
- name, registerNumber (unique), department, year, section, score, connected

**Questions**
- category, difficulty, question, options A-D, correct, hint, explanation, fact, points

**Answers**
- studentId, questionId, option, correct, timeMs

**Teams** (future expansion)
- name

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/admin/login` | Admin login → JWT token |
| POST | `/api/students/register` | Student registration |
| GET | `/api/students` | List all students |
| GET | `/api/questions` | Get all 40 questions |
| GET | `/api/exports/results/csv` | Download CSV results |
| GET | `/api/exports/results/xlsx` | Download XLSX results |
| GET | `/api/exports/certificate/:registerNumber` | Download PDF certificate |

## Socket Events

**Admin Emits:**
- `admin:startQuestion` → { question }
- `admin:reveal` → { questionId }

**Students Emit:**
- `student:join` → { registerNumber }
- `student:answer` → { registerNumber, questionId, option, timeMs }

**Server Broadcasts:**
- `lobby:update` → { count }
- `question:start` → { question, seconds }
- `question:tick` → { seconds }
- `question:end` → { questionId }
- `question:reveal` → { questionId, correct, explanation, fact }
- `leaderboard:update` → { leaderboard }

## Production Deployment

### Build Frontend
```powershell
cd frontend
npm run build
# Outputs to frontend/dist
```

### Serve Production
Use any static host + backend on separate port:
```powershell
# Backend
cd backend
npm install
npx prisma db push
node src/server.js

# Frontend (using http-server or similar)
# Serve dist folder on port 3000
npx http-server frontend/dist -p 3000
```

Then access: `http://<YOUR_IP>:3000`

## Environment Variables

**.env (Backend)**
```
PORT=4000
ADMIN_USER=admin
ADMIN_PASS=password
ADMIN_SECRET=change_me_long_secret
DATABASE_URL="file:./dev.db"
```

## Troubleshooting

**"Cannot find module"** → Run `npm install` in backend and frontend folders

**Socket connection failed** → Ensure backend is running on port 4000; check firewall

**Prisma errors** → Run `npx prisma generate` and `npx prisma db push`

**Port already in use** → Change `PORT` in .env or kill conflicting process

## File Sizes & Performance

- Backend: ~15 MB (with node_modules)
- Frontend: ~8 MB (dev), ~2 MB (production build)
- SQLite DB: <1 MB (even with results)
- Optimal for: 50-200 simultaneous participants over LAN

## License

Educational use. Modify freely for your institution.

## Support

For issues or features, refer to docs/ folder or modify code as needed.

---

**Ready to conduct your cyber security quiz!** 🚀
