# 🚀 Hosting & Deployment Guide: Render + Supabase

This guide provides instructions to connect and host **SIH Quiz Arena** on **Render** (Cloud Hosting) and **Supabase** (Managed PostgreSQL Database).

---

## 📦 Architecture Overview

- **Database**: Supabase PostgreSQL (Managed cloud PostgreSQL with pgBouncer transaction connection pooling)
- **Backend Service**: Render Web Service (Node.js + Express + Socket.io WebSockets)
- **Frontend Static Site**: Render Static Site (React + Vite SPA)

---

## 🗄️ Part 1: Supabase Configuration

1. Log in to [Supabase](https://supabase.com) and create a project (or use an existing one).
2. Go to **Project Settings** > **Database** > **Connection string**.
3. Select **URI** (Connection Pooling mode: Port 5432 or 6543).
4. Copy the connection string. It has the format:
   ```text
   postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres
   ```
5. In `backend/.env` (and in Render backend environment variables):
   ```env
   DATABASE_URL="postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres"
   ```
6. Sync schema to Supabase:
   ```bash
   cd backend
   npx prisma db push
   ```

---

## 🌐 Part 2: Deploying to Render

### Option A: 1-Click Infrastructure as Code (Recommended)

The repository includes `render.yaml` preconfigured for both services:

1. Push your latest code to your GitHub / GitLab repository.
2. Go to the [Render Dashboard](https://dashboard.render.com).
3. Click **New +** > **Blueprint**.
4. Connect your Git repository.
5. Render will automatically detect `render.yaml` and configure:
   - **Backend Web Service (`sih-quiz-backend`)**
     - Build Command: `cd backend && npm install && npx prisma generate`
     - Start Command: `cd backend && node src/server.js`
     - Environment Variables:
       - `NODE_VERSION`: `18.17.0`
       - `PORT`: `4000`
       - `ADMIN_USER`: `admin`
       - `ADMIN_PASS`: `impossible`
       - `ADMIN_SECRET`: Auto-generated
       - `DATABASE_URL`: Set to your Supabase PostgreSQL URI (enter in Render prompt)
   - **Frontend Static Site (`sih-quiz-frontend`)**
     - Build Command: `cd frontend && npm install && npm run build`
     - Publish Directory: `frontend/dist`
     - Environment Variables:
       - `VITE_BACKEND_URL`: Automatically linked to `https://sih-quiz-backend.onrender.com`
6. Click **Apply**.

---

### Option B: Manual Setup via Render Dashboard

#### 1. Backend Web Service
- **Name**: `sih-quiz-backend`
- **Environment**: `Node`
- **Root Directory**: Leave blank (or `backend`)
- **Build Command**: `cd backend && npm install && npx prisma generate`
- **Start Command**: `cd backend && node src/server.js`
- **Environment Variables**:
  | Key | Value |
  |---|---|
  | `NODE_VERSION` | `18.17.0` |
  | `PORT` | `4000` |
  | `ADMIN_USER` | `admin` |
  | `ADMIN_PASS` | `impossible` |
  | `ADMIN_SECRET` | `cyber_quiz_arena_jwt_secret_key_2026` |
  | `DATABASE_URL` | `postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres` |

#### 2. Frontend Static Site
- **Name**: `sih-quiz-frontend`
- **Environment**: `Static Site`
- **Build Command**: `cd frontend && npm install && npm run build`
- **Publish Directory**: `frontend/dist`
- **Environment Variables**:
  | Key | Value |
  |---|---|
  | `VITE_BACKEND_URL` | `https://sih-quiz-backend.onrender.com` (Your backend Render URL) |

---

## 🔒 Security & Admin Access

- **Admin Login Route**: `/admin`
- **Username**: `admin`
- **Password**: `impossible`
- **Anti-Cheat Feature**: If any student switches tabs, windows, or apps during a live quiz:
  - Their screen is immediately locked with an access restriction overlay.
  - The quiz **continues uninterrupted** for all other participants.
  - The admin receives an instant alert in the Admin Dashboard with an **"Allow Participant"** action to release the participant on demand.
