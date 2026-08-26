import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import App from './App'
import StudentRegister from './pages/StudentRegister'
import LeaderboardPage from './pages/LeaderboardPage'
import QuizPage from './pages/QuizPage'
import AdminDashboard from './pages/AdminDashboardSecure'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/quiz" replace />} />
        <Route path="/register" element={<StudentRegister/>} />
        <Route path="/leaderboard" element={<LeaderboardPage/>} />
        <Route path="/quiz" element={<QuizPage/>} />
        <Route path="/admin" element={<AdminDashboard/>} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
)