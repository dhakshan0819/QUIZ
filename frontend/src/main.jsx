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
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/home" element={<App />} />
        <Route path="/register" element={<StudentRegister />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="/quiz" element={<QuizPage />} />
        <Route path="/admin" element={<AdminDashboard />} />
        
        {/* Aliases and nested fallbacks */}
        <Route path="/quiz/admin" element={<Navigate to="/admin" replace />} />
        <Route path="/quiz/register" element={<Navigate to="/register" replace />} />
        <Route path="/quiz/leaderboard" element={<Navigate to="/leaderboard" replace />} />
        
        {/* Catch-all fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
)