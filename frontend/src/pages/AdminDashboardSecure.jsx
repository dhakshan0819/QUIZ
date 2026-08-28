import React, { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import socket from '../utils/socket'
import { getBackendUrl } from '../utils/config'

const ParticleBackground = () => {
  const [particles, setParticles] = useState([])

  useEffect(() => {
    const newParticles = Array.from({ length: 10 }).map((_, i) => ({
      id: i,
      size: ['small', 'medium', 'large'][Math.floor(Math.random() * 3)],
      left: Math.random() * 100,
      top: Math.random() * 100,
      delay: Math.random() * 2,
    }))
    setParticles(newParticles)
  }, [])

  return (
    <div className="particles">
      {particles.map(p => (
        <div
          key={p.id}
          className={`particle ${p.size}`}
          style={{ left: `${p.left}%`, top: `${p.top}%`, animationDelay: `${p.delay}s` }}
        />
      ))}
    </div>
  )
}

function LoginPanel({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    setBusy(true)
    setMessage('Logging in...')
    try {
      const response = await fetch(`${getBackendUrl()}/api/auth/admin/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const result = await response.json()
      if (!response.ok) {
        setMessage(result.error || 'Invalid credentials')
        setBusy(false)
        return
      }
      localStorage.setItem('adminAuth', JSON.stringify({ token: result.token, username }))
      onLogin(result.token)
    } catch {
      setMessage('Network error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="glass cyber-glow w-full max-w-md rounded-2xl p-8 relative z-10">
        <h1 className="text-4xl font-black text-center bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent mb-2">ADMIN LOGIN</h1>
        <p className="text-center text-cyan-200/60 mb-6">Enter admin credentials</p>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-cyan-300 text-sm font-semibold mb-2">Username</label>
            <input value={username} onChange={(e) => setUsername(e.target.value)} className="w-full px-4 py-3 bg-cyan-500/5 border border-cyan-500/30 rounded-lg text-cyan-100 placeholder-cyan-400/40" placeholder="admin" />
          </div>
          <div>
            <label className="block text-cyan-300 text-sm font-semibold mb-2">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-3 bg-cyan-500/5 border border-cyan-500/30 rounded-lg text-cyan-100 placeholder-cyan-400/40" placeholder="••••••••" />
          </div>
          {message && <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-100">{message}</div>}
          <button disabled={busy} className="btn-cyber w-full px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold rounded-lg">
            {busy ? 'LOGGING IN...' : 'LOGIN'}
          </button>
        </form>
      </div>
    </div>
  )
}

function EditStudentModal({ student, onClose, onRefresh, adminToken }) {
  const [formData, setFormData] = useState({
    name: student?.name || '',
    registerNumber: student?.registerNumber || '',
    department: student?.department || '',
    score: student?.score || 0
  })

  const submit = async () => {
    const url = student 
      ? `${getBackendUrl()}/api/students/${student.id}` 
      : `${getBackendUrl()}/api/students/manual`
    
    const method = student ? 'PUT' : 'POST'
    
    try {
      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify(formData)
      })
      if (res.ok) {
        onRefresh()
        onClose()
      } else {
        alert('Failed to save student data')
      }
    } catch(e) {
      alert('Network error')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="glass cyber-glow rounded-2xl max-w-sm w-full p-6 relative border border-cyan-500/30">
        <button onClick={onClose} className="absolute top-4 right-4 text-cyan-300 hover:text-cyan-100">✕</button>
        <h3 className="text-xl font-bold text-cyan-300 mb-4">{student ? 'Edit Participant' : 'Add Participant'}</h3>
        <div className="space-y-3">
          <input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Full Name" className="w-full px-3 py-2 bg-cyan-500/10 border border-cyan-500/30 rounded text-cyan-100" />
          <input value={formData.registerNumber} onChange={e => setFormData({...formData, registerNumber: e.target.value})} placeholder="Register Number" className="w-full px-3 py-2 bg-cyan-500/10 border border-cyan-500/30 rounded text-cyan-100" />
          <input value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} placeholder="Department" className="w-full px-3 py-2 bg-cyan-500/10 border border-cyan-500/30 rounded text-cyan-100" />
          <input type="number" value={formData.score} onChange={e => setFormData({...formData, score: e.target.value})} placeholder="Score" className="w-full px-3 py-2 bg-cyan-500/10 border border-cyan-500/30 rounded text-cyan-100" />
          <button onClick={submit} className="btn-cyber w-full py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold rounded">SAVE</button>
        </div>
      </div>
    </div>
  )
}

export default function AdminDashboardSecure() {
  const navigate = useNavigate()
  const stored = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('adminAuth') || 'null') } catch { return null }
  }, [])

  const [adminToken, setAdminToken] = useState(stored?.token || '')
  const [students, setStudents] = useState([])
  const [quizzes, setQuizzes] = useState([])
  const [activeQuizNumber, setActiveQuizNumber] = useState(1)
  const [quizStarted, setQuizStarted] = useState(false)
  const [answerTimeLimit, setAnswerTimeLimit] = useState(15)
  const [previewTimeLimit, setPreviewTimeLimit] = useState(5)

  // Start Confirmation Modal State
  const [confirmQuizModal, setConfirmQuizModal] = useState({ show: false, quiz: null })

  // Question Upload & Management State
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [jsonInput, setJsonInput] = useState('')
  const [partitionMode, setPartitionMode] = useState('count') // 'count' | 'perQuiz' | 'single'
  const [partitionCount, setPartitionCount] = useState(3)
  const [questionsPerQuiz, setQuestionsPerQuiz] = useState(10)
  const [targetQuizNumber, setTargetQuizNumber] = useState(1)
  const [uploadMode, setUploadMode] = useState('replace') // 'replace' | 'append'
  const [uploadStatus, setUploadStatus] = useState(null)
  const [isUploading, setIsUploading] = useState(false)

  // Question Viewer
  const [selectedQuizQuestions, setSelectedQuizQuestions] = useState(null)
  const [viewingQuizNum, setViewingQuizNum] = useState(null)

  // Export / QR / Alerts
  const [showExports, setShowExports] = useState(false)
  const [certStudent, setCertStudent] = useState('')
  const [showQR, setShowQR] = useState(false)
  const [qrInfo, setQrInfo] = useState({ qrCode: '', url: '' })
  const [cheatAlerts, setCheatAlerts] = useState([])
  const [lockedStudents, setLockedStudents] = useState({}) // { [registerNumber]: { name, reason, timestamp } }
  const [editingStudent, setEditingStudent] = useState(undefined)
  const [showEditModal, setShowEditModal] = useState(false)

  // Live Quiz Manual Progression & Leaderboard Broadcast State
  const [isBroadcastingLeaderboard, setIsBroadcastingLeaderboard] = useState(false)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(1)

  const refreshData = () => {
    // Fetch students
    fetch(`${getBackendUrl()}/api/students`)
      .then(r => r.json())
      .then(j => setStudents(j.students || []))
      .catch(err => console.error(err))
    
    // Fetch quizzes breakdown and global status
    fetch(`${getBackendUrl()}/api/quiz/quizzes`)
      .then(r => r.json())
      .then(j => {
        if (j.quizzes) setQuizzes(j.quizzes)
        if (j.activeQuizNumber) setActiveQuizNumber(j.activeQuizNumber)
        if (j.quizStarted !== undefined) setQuizStarted(j.quizStarted)
        if (j.answerTimeLimit) setAnswerTimeLimit(j.answerTimeLimit)
        if (j.previewTimeLimit) setPreviewTimeLimit(j.previewTimeLimit)
      })
      .catch(err => console.error(err))

    fetch(`${getBackendUrl()}/api/quiz/status`)
      .then(r => r.json())
      .then(j => {
        if (j.currentQuestionIndex) setCurrentQuestionIndex(j.currentQuestionIndex)
        if (j.showLeaderboardOverlay !== undefined) setIsBroadcastingLeaderboard(j.showLeaderboardOverlay)
      })
      .catch(() => {})

    fetch(`${getBackendUrl()}/api/quiz/locked-students`)
      .then(r => r.json())
      .then(j => {
        if (j.lockedStudents) setLockedStudents(j.lockedStudents)
      })
      .catch(() => {})
  }

  useEffect(() => {
    if (!adminToken) return
    refreshData()

    const handleLobbyUpdate = () => refreshData()

    socket.emit('student:join', { registerNumber: 'ADMIN' })
    socket.on('lobby:update', handleLobbyUpdate)
    socket.on('leaderboard:update', handleLobbyUpdate)
    socket.on('quiz:start', (payload) => {
      setQuizStarted(true)
      setCurrentQuestionIndex(1)
      setIsBroadcastingLeaderboard(false)
      if (payload?.quizNumber) setActiveQuizNumber(payload.quizNumber)
      refreshData()
    })
    socket.on('quiz:stop', () => {
      setQuizStarted(false)
      setIsBroadcastingLeaderboard(false)
      refreshData()
    })
    socket.on('quiz:nextQuestion', (payload) => {
      if (payload?.currentQuestionIndex) setCurrentQuestionIndex(payload.currentQuestionIndex)
      setIsBroadcastingLeaderboard(false)
    })
    socket.on('leaderboard:display', (payload) => {
      setIsBroadcastingLeaderboard(Boolean(payload?.show))
    })
    socket.on('admin:cheat_alert', (payload) => {
      setCheatAlerts(prev => [payload, ...prev].slice(0, 50))
      if (payload?.registerNumber) {
        setLockedStudents(prev => ({
          ...prev,
          [payload.registerNumber]: {
            name: payload.name,
            reason: payload.action,
            timestamp: payload.timestamp
          }
        }))
      }
    })
    socket.on('admin:student_unlocked', (payload) => {
      if (payload?.registerNumber) {
        setLockedStudents(prev => {
          const updated = { ...prev }
          delete updated[payload.registerNumber]
          return updated
        })
      }
    })

    return () => {
      socket.off('lobby:update', handleLobbyUpdate)
      socket.off('leaderboard:update', handleLobbyUpdate)
      socket.off('quiz:start')
      socket.off('quiz:stop')
      socket.off('quiz:nextQuestion')
      socket.off('leaderboard:display')
      socket.off('admin:cheat_alert')
      socket.off('admin:student_unlocked')
    }
  }, [adminToken])

  // Explicitly unlock a student so they can resume answering
  const handleUnlockStudent = async (registerNumber) => {
    try {
      await fetch(`${getBackendUrl()}/api/quiz/unlock-student`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registerNumber })
      })
      socket.emit('admin:unlockStudent', { registerNumber })
      setLockedStudents(prev => {
        const updated = { ...prev }
        delete updated[registerNumber]
        return updated
      })
    } catch (e) {
      console.error('Error unlocking student:', e)
    }
  }

  // Advance to Next Question for all participants
  const handleBroadcastNextQuestion = async () => {
    try {
      await fetch(`${getBackendUrl()}/api/quiz/next-question`, { method: 'POST' })
      socket.emit('admin:nextQuestion')
      setIsBroadcastingLeaderboard(false)
      setCurrentQuestionIndex(prev => prev + 1)
    } catch (e) {
      console.error(e)
    }
  }

  // Toggle Leaderboard broadcast on all participant screens
  const handleToggleBroadcastLeaderboard = async () => {
    try {
      const nextShow = !isBroadcastingLeaderboard
      await fetch(`${getBackendUrl()}/api/quiz/toggle-leaderboard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ show: nextShow })
      })
      socket.emit('admin:showLeaderboard', { show: nextShow })
      setIsBroadcastingLeaderboard(nextShow)
    } catch (e) {
      console.error(e)
    }
  }

  // Start Quiz Handler (triggered after confirmation)
  const executeStartQuiz = async (quizNumber) => {
    try {
      const qNum = Number(quizNumber)
      const res = await fetch(`${getBackendUrl()}/api/quiz/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quizNumber: qNum })
      })
      if (res.ok) {
        setActiveQuizNumber(qNum)
        setQuizStarted(true)
        setCurrentQuestionIndex(1)
        setIsBroadcastingLeaderboard(false)
        socket.emit('admin:startQuiz', { quizNumber: qNum })
        setConfirmQuizModal({ show: false, quiz: null })
        refreshData()
      } else {
        alert('Failed to start quiz.')
      }
    } catch (e) {
      console.error(e)
      alert('Network error starting quiz.')
    }
  }

  // Stop Quiz Handler
  const stopQuiz = async () => {
    try {
      await fetch(`${getBackendUrl()}/api/quiz/stop`, { method: 'POST' })
      setQuizStarted(false)
      setIsBroadcastingLeaderboard(false)
      socket.emit('admin:stopQuiz')
      refreshData()
    } catch(e) {
      console.error(e)
    }
  }

  // Handle clicking on a Quiz card
  const handleQuizCardClick = (quiz) => {
    if (quizStarted && activeQuizNumber === quiz.quizNumber) {
      // If already running this quiz, offer to stop
      if (window.confirm(`Stop Quiz ${quiz.quizNumber}?`)) {
        stopQuiz()
      }
    } else {
      // Open start confirmation modal
      setConfirmQuizModal({ show: true, quiz })
    }
  }

  // JSON Upload handler
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      setJsonInput(event.target.result)
    }
    reader.readAsText(file)
  }

  const submitQuestionUpload = async () => {
    if (!jsonInput.trim()) {
      setUploadStatus({ type: 'error', message: 'Please paste JSON or upload a file first.' })
      return
    }

    let parsedQuestions
    try {
      const parsed = JSON.parse(jsonInput)
      parsedQuestions = Array.isArray(parsed) ? parsed : (parsed.questions || [])
      if (!Array.isArray(parsedQuestions) || parsedQuestions.length === 0) {
        throw new Error('JSON must be an array of questions or an object with a "questions" array.')
      }
    } catch (err) {
      setUploadStatus({ type: 'error', message: 'Invalid JSON format: ' + err.message })
      return
    }

    setIsUploading(true)
    setUploadStatus({ type: 'loading', message: 'Uploading and partitioning questions...' })

    try {
      const res = await fetch(`${getBackendUrl()}/api/quiz/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questions: parsedQuestions,
          partitionMode,
          partitionCount: Number(partitionCount),
          questionsPerQuiz: Number(questionsPerQuiz),
          targetQuizNumber: Number(targetQuizNumber),
          mode: uploadMode
        })
      })

      const data = await res.json()
      if (res.ok) {
        setUploadStatus({ type: 'success', message: data.message })
        refreshData()
        setTimeout(() => {
          setShowUploadModal(false)
          setUploadStatus(null)
          setJsonInput('')
        }, 1500)
      } else {
        setUploadStatus({ type: 'error', message: data.error || 'Upload failed.' })
      }
    } catch (e) {
      setUploadStatus({ type: 'error', message: 'Network error during upload.' })
    } finally {
      setIsUploading(false)
    }
  }

  // Re-partition existing questions
  const repartitionExisting = async () => {
    const count = prompt('How many equal quizzes do you want to divide all existing questions into?', '3')
    if (!count || isNaN(count)) return

    try {
      const res = await fetch(`${getBackendUrl()}/api/quiz/repartition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partitionCount: Number(count) })
      })
      const data = await res.json()
      if (res.ok) {
        alert(data.message)
        refreshData()
      } else {
        alert(data.error || 'Failed to repartition.')
      }
    } catch (e) {
      alert('Network error')
    }
  }

  // Update Timers
  const updateTimerSettings = async () => {
    try {
      const res = await fetch(`${getBackendUrl()}/api/quiz/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answerTimeLimit: Number(answerTimeLimit),
          previewTimeLimit: Number(previewTimeLimit)
        })
      })
      if (res.ok) {
        alert(`Timers updated: ${answerTimeLimit}s answer time + ${previewTimeLimit}s preview time (Total ${Number(answerTimeLimit) + Number(previewTimeLimit)}s / question)`)
      }
    } catch (e) {
      alert('Failed to update timer settings')
    }
  }

  // View questions for a quiz
  const viewQuizQuestions = async (quizNum) => {
    setViewingQuizNum(quizNum)
    try {
      const res = await fetch(`${getBackendUrl()}/api/quiz/questions?quizNumber=${quizNum}`)
      const data = await res.json()
      setSelectedQuizQuestions(data.questions || [])
    } catch (e) {
      console.error(e)
    }
  }

  const deleteQuestion = async (id) => {
    if (!window.confirm('Delete this question?')) return
    try {
      const res = await fetch(`${getBackendUrl()}/api/quiz/questions/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setSelectedQuizQuestions(prev => prev.filter(q => q.id !== id))
        refreshData()
      }
    } catch (e) {
      alert('Failed to delete question')
    }
  }

  const removeParticipant = (registerNumber) => {
    if (!window.confirm(`Are you absolutely sure you want to remove ${registerNumber} and wipe their answers?`)) return
    
    fetch(`${getBackendUrl()}/api/students/${registerNumber}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    })
    .then(res => {
      if (res.ok) {
        socket.emit('admin:removeParticipant', { registerNumber })
        refreshData()
      } else {
        alert('Failed to remove participant from database.')
      }
    })
    .catch(err => console.error(err))
  }

  const handleHardReset = async () => {
    if (!window.confirm('⚠️ DANGER: Are you absolutely sure you want to WIPE ALL STUDENTS, ANSWERS, and LOGS? This cannot be undone.')) return;
    if (!window.confirm('Final warning: This will permanently delete all quiz data and kick all players. Proceed?')) return;
    
    try {
      const res = await fetch(`${getBackendUrl()}/api/quiz/hard-reset`, { method: 'POST' });
      if (res.ok) {
        setCheatAlerts([]);
        setQuizStarted(false);
        socket.emit('admin:hardReset');
        refreshData();
        alert('System has been completely reset.');
      } else {
        alert('Failed to perform hard reset on the server.');
      }
    } catch(err) {
      console.error(err);
      alert('Network error during hard reset.');
    }
  }

  const downloadCSV = () => { window.location.href = `${getBackendUrl()}/api/exports/results/csv` }
  const downloadXLSX = () => { window.location.href = `${getBackendUrl()}/api/exports/results/xlsx` }
  const downloadCertificate = () => { if (certStudent.trim()) window.location.href = `${getBackendUrl()}/api/exports/certificate/${certStudent}` }

  const openQRModal = async () => {
    try {
      const res = await fetch(`${getBackendUrl()}/api/qr/join-qr`)
      if (res.ok) {
        const data = await res.json()
        setQrInfo({ qrCode: data.qrCode, url: data.url })
        setShowQR(true)
      }
    } catch (err) {
      console.error('Error fetching dynamic join QR code:', err)
    }
  }

  const sampleJsonTemplate = `[
  {
    "question": "What does CPU stand for in computer systems?",
    "optionA": "Central Process Unit",
    "optionB": "Central Processing Unit",
    "optionC": "Computer Power Unit",
    "optionD": "Control Processing Unit",
    "correct": "B",
    "category": "Computer Fundamentals",
    "difficulty": "Easy",
    "explanation": "CPU stands for Central Processing Unit.",
    "fact": "The CPU performs the fundamental arithmetic and logic calculations.",
    "points": 10
  }
]`

  const logout = () => {
    localStorage.removeItem('adminAuth')
    setAdminToken('')
    navigate('/admin')
  }

  if (!adminToken) {
    return (
      <>
        <ParticleBackground />
        <LoginPanel onLogin={setAdminToken} />
      </>
    )
  }

  return (
    <>
      <ParticleBackground />
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="content-wrapper page-shell p-4 md:p-8 relative">
        {/* Glow elements */}
        <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 left-10 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>

        {/* Start Quiz Confirmation Modal */}
        {confirmQuizModal.show && confirmQuizModal.quiz && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <div className="glass cyber-glow rounded-3xl max-w-md w-full p-8 border border-cyan-500/40 text-center animate-fade-in-up">
              <div className="text-5xl mb-4 animate-bounce">🚀</div>
              <h2 className="text-3xl font-black bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent mb-2">
                Start {confirmQuizModal.quiz.title}?
              </h2>
              <div className="bg-cyan-500/10 rounded-xl p-4 my-4 border border-cyan-500/20 text-sm text-cyan-200/80 space-y-2 text-left">
                <div className="flex justify-between">
                  <span className="font-semibold text-cyan-300">Total Questions:</span>
                  <span className="font-bold text-white font-mono">{confirmQuizModal.quiz.count} Questions</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-cyan-300">Answer Timer:</span>
                  <span className="font-bold text-white font-mono">{answerTimeLimit}s per question</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-cyan-300">Answer Preview:</span>
                  <span className="font-bold text-white font-mono">{previewTimeLimit}s preview</span>
                </div>
                <div className="flex justify-between border-t border-cyan-500/20 pt-2">
                  <span className="font-semibold text-cyan-300">Total Question Cycle:</span>
                  <span className="font-bold text-cyan-400 font-mono">{Number(answerTimeLimit) + Number(previewTimeLimit)}s total</span>
                </div>
              </div>
              <p className="text-cyan-200/70 text-xs mb-6">
                All connected participants will immediately be directed to <strong>{confirmQuizModal.quiz.title}</strong> and their timers will begin.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmQuizModal({ show: false, quiz: null })}
                  className="w-1/2 py-3 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-cyan-200 font-bold hover:bg-cyan-500/20"
                >
                  Cancel
                </button>
                <button
                  onClick={() => executeStartQuiz(confirmQuizModal.quiz.quizNumber)}
                  className="w-1/2 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-black rounded-xl shadow-lg shadow-green-500/30 hover:scale-105 transition active:scale-95"
                >
                  Confirm & Launch
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Upload & Partition Questions Modal */}
        {showUploadModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <div className="glass cyber-glow rounded-3xl max-w-2xl w-full p-6 md:p-8 border border-cyan-500/40 relative max-h-[90vh] overflow-y-auto">
              <button 
                onClick={() => { setShowUploadModal(false); setUploadStatus(null); }} 
                className="absolute top-5 right-5 text-cyan-300 hover:text-white font-bold text-xl"
              >
                ✕
              </button>
              <h2 className="text-2xl font-black bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent mb-1">
                Upload & Partition Questions
              </h2>
              <p className="text-cyan-200/60 text-xs mb-6">
                Upload JSON formatted quiz questions and automatically divide them equally into Quiz 1, Quiz 2, Quiz 3...
              </p>

              {uploadStatus && (
                <div className={`mb-4 p-3 rounded-lg text-sm font-medium ${
                  uploadStatus.type === 'success' ? 'bg-green-500/20 text-green-300 border border-green-500/30' :
                  uploadStatus.type === 'error' ? 'bg-red-500/20 text-red-300 border border-red-500/30' :
                  'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 animate-pulse'
                }`}>
                  {uploadStatus.message}
                </div>
              )}

              {/* Upload controls */}
              <div className="space-y-4">
                {/* File picker */}
                <div className="flex items-center gap-3">
                  <label className="cursor-pointer px-4 py-2 bg-cyan-500/20 border border-cyan-500/30 rounded-lg text-cyan-200 font-bold text-xs hover:bg-cyan-500/30 transition">
                    📁 Choose .JSON File
                    <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
                  </label>
                  <button 
                    onClick={() => setJsonInput(sampleJsonTemplate)}
                    className="px-3 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-lg text-cyan-300 text-xs hover:bg-cyan-500/20 font-mono"
                  >
                    📋 Paste Sample JSON Template
                  </button>
                </div>

                {/* JSON textarea */}
                <div>
                  <label className="block text-xs font-bold text-cyan-300 mb-1">JSON Question Array</label>
                  <textarea
                    value={jsonInput}
                    onChange={(e) => setJsonInput(e.target.value)}
                    rows={7}
                    placeholder="[ { 'question': '...', 'optionA': '...', 'optionB': '...', 'optionC': '...', 'optionD': '...', 'correct': 'A' } ]"
                    className="w-full px-3 py-2 bg-black/40 border border-cyan-500/30 rounded-lg text-cyan-100 font-mono text-xs focus:outline-none focus:border-cyan-400"
                  />
                </div>

                {/* Partitioning Parameters */}
                <div className="bg-cyan-500/5 p-4 rounded-xl border border-cyan-500/20 space-y-4">
                  <div className="font-bold text-cyan-300 text-sm">Partition Parameters:</div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-cyan-200/70 mb-1">Partition Strategy</label>
                      <select 
                        value={partitionMode} 
                        onChange={(e) => setPartitionMode(e.target.value)}
                        className="w-full px-3 py-2 bg-black/50 border border-cyan-500/30 rounded-lg text-cyan-100 text-xs"
                      >
                        <option value="count">Divide equally into N Quizzes</option>
                        <option value="perQuiz">Split by N Questions per Quiz</option>
                        <option value="single">Assign all to a specific Quiz</option>
                      </select>
                    </div>

                    {partitionMode === 'count' && (
                      <div>
                        <label className="block text-xs text-cyan-200/70 mb-1">Number of Quizzes (e.g., 3 for Quiz 1, 2, 3)</label>
                        <input
                          type="number"
                          min="1"
                          max="20"
                          value={partitionCount}
                          onChange={(e) => setPartitionCount(e.target.value)}
                          className="w-full px-3 py-2 bg-black/50 border border-cyan-500/30 rounded-lg text-cyan-100 text-xs"
                        />
                      </div>
                    )}

                    {partitionMode === 'perQuiz' && (
                      <div>
                        <label className="block text-xs text-cyan-200/70 mb-1">Questions per Quiz (e.g., 10)</label>
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={questionsPerQuiz}
                          onChange={(e) => setQuestionsPerQuiz(e.target.value)}
                          className="w-full px-3 py-2 bg-black/50 border border-cyan-500/30 rounded-lg text-cyan-100 text-xs"
                        />
                      </div>
                    )}

                    {partitionMode === 'single' && (
                      <div>
                        <label className="block text-xs text-cyan-200/70 mb-1">Target Quiz Number</label>
                        <input
                          type="number"
                          min="1"
                          max="20"
                          value={targetQuizNumber}
                          onChange={(e) => setTargetQuizNumber(e.target.value)}
                          className="w-full px-3 py-2 bg-black/50 border border-cyan-500/30 rounded-lg text-cyan-100 text-xs"
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-6 pt-2">
                    <label className="flex items-center gap-2 text-xs text-cyan-200 cursor-pointer">
                      <input 
                        type="radio" 
                        name="uploadMode" 
                        checked={uploadMode === 'replace'} 
                        onChange={() => setUploadMode('replace')}
                      />
                      <span>Replace existing questions in database</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs text-cyan-200 cursor-pointer">
                      <input 
                        type="radio" 
                        name="uploadMode" 
                        checked={uploadMode === 'append'} 
                        onChange={() => setUploadMode('append')}
                      />
                      <span>Append to existing questions</span>
                    </label>
                  </div>
                </div>

                {/* Submit button */}
                <button
                  onClick={submitQuestionUpload}
                  disabled={isUploading || !jsonInput.trim()}
                  className="btn-cyber w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold rounded-xl disabled:opacity-50"
                >
                  {isUploading ? 'PROCESSING & PARTITIONING...' : 'UPLOAD & PARTITION QUESTIONS'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* View Quiz Questions Modal */}
        {selectedQuizQuestions && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <div className="glass cyber-glow rounded-3xl max-w-3xl w-full p-6 md:p-8 border border-cyan-500/40 relative max-h-[85vh] flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-cyan-300">
                  Questions in Quiz {viewingQuizNum} ({selectedQuizQuestions.length})
                </h3>
                <button onClick={() => setSelectedQuizQuestions(null)} className="text-cyan-300 hover:text-white font-bold text-xl">✕</button>
              </div>
              <div className="overflow-y-auto space-y-3 flex-1 pr-2">
                {selectedQuizQuestions.length === 0 ? (
                  <div className="text-center py-8 text-cyan-200/50">No questions in this quiz.</div>
                ) : (
                  selectedQuizQuestions.map((q, idx) => (
                    <div key={q.id} className="bg-cyan-500/5 border border-cyan-500/20 rounded-xl p-4 space-y-2">
                      <div className="flex justify-between items-start gap-3">
                        <span className="font-bold text-white text-sm">#{idx + 1}. {q.question}</span>
                        <button onClick={() => deleteQuestion(q.id)} className="text-red-400 hover:text-red-300 text-xs px-2 py-1 bg-red-500/10 rounded border border-red-500/20">Delete</button>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-cyan-200/80">
                        <div className={q.correct === 'A' ? 'text-green-300 font-bold' : ''}>A: {q.optionA}</div>
                        <div className={q.correct === 'B' ? 'text-green-300 font-bold' : ''}>B: {q.optionB}</div>
                        <div className={q.correct === 'C' ? 'text-green-300 font-bold' : ''}>C: {q.optionC}</div>
                        <div className={q.correct === 'D' ? 'text-green-300 font-bold' : ''}>D: {q.optionD}</div>
                      </div>
                      {q.explanation && (
                        <div className="text-[11px] text-cyan-300/60 pt-1 border-t border-cyan-500/10">
                          <strong>Explanation:</strong> {q.explanation}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Edit Student Modal */}
        {showEditModal && (
          <EditStudentModal 
            student={editingStudent} 
            adminToken={adminToken} 
            onClose={() => setShowEditModal(false)} 
            onRefresh={refreshData} 
          />
        )}

        {/* QR Code Modal */}
        {showQR && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <div className="glass cyber-glow rounded-2xl max-w-sm w-full p-6 text-center relative border border-cyan-500/30">
              <button onClick={() => setShowQR(false)} className="absolute top-4 right-4 text-cyan-300 hover:text-cyan-100 font-black text-xl w-8 h-8 rounded-full border border-cyan-500/20 flex items-center justify-center bg-black/40">✕</button>
              <h3 className="text-2xl font-black bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-300 bg-clip-text text-transparent mb-1 mt-2">SCAN TO REGISTER</h3>
              <p className="text-cyan-200/60 text-xs mb-5">Point your camera to join the Quiz Network</p>
              {qrInfo.qrCode ? (
                <div className="bg-white p-4 rounded-2xl inline-block mb-5 shadow-2xl shadow-cyan-500/20">
                  <img src={qrInfo.qrCode} alt="Join QR Code" className="w-48 h-48 block" />
                </div>
              ) : (
                <div className="h-48 flex items-center justify-center text-cyan-300 font-mono animate-pulse">GENERATING QR CODE...</div>
              )}
              <div className="bg-cyan-500/10 p-3 rounded-lg border border-cyan-500/20 mt-2">
                <span className="block text-[10px] text-cyan-300/60 uppercase tracking-widest font-semibold mb-1">Direct IP Address</span>
                <span className="text-cyan-100 font-mono text-sm underline select-all break-all">{qrInfo.url}</span>
              </div>
            </div>
          </div>
        )}

        {/* Top Header */}
        <div className="mb-8 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-300 bg-clip-text text-transparent mb-1">
              ADMIN CONTROL CENTER
            </h1>
            <p className="text-cyan-200/60 text-sm">
              Manage Multi-Quiz Sets • Auto-Partition Questions • 15s/5s Timers • Real-Time Anti-Cheat
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => window.open('/leaderboard', '_blank')} className="px-4 py-2 rounded-lg bg-yellow-500/20 text-yellow-300 border border-yellow-400/30 font-bold hover:bg-yellow-500/30 transition shadow-lg shadow-yellow-500/10 text-xs md:text-sm">🏆 Leaderboard</button>
            <button onClick={openQRModal} className="px-4 py-2 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 font-bold hover:bg-cyan-500/30 transition shadow-lg shadow-cyan-500/10 text-xs md:text-sm">🔗 Join QR</button>
            <button onClick={logout} className="px-4 py-2 rounded-lg bg-red-500/20 text-red-200 border border-red-400/30 font-semibold hover:bg-red-500/30 text-xs md:text-sm">Logout</button>
          </div>
        </div>

        {/* LIVE BROADCAST COMMAND CENTER (Active when Quiz is Started) */}
        {quizStarted && (
          <div className="glass cyber-glow border-2 border-cyan-400/60 bg-gradient-to-r from-cyan-950/90 via-blue-950/90 to-purple-950/90 rounded-3xl p-6 mb-6 shadow-2xl shadow-cyan-500/20 animate-fade-in-up">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="w-3 h-3 rounded-full bg-green-400 animate-ping" />
                  <span className="px-3 py-1 bg-green-500/20 border border-green-500/40 text-green-300 rounded-full text-xs font-black uppercase tracking-wider">
                    🟢 LIVE ON AIR: QUIZ {activeQuizNumber}
                  </span>
                  <span className="px-3 py-1 bg-cyan-500/20 border border-cyan-500/30 text-cyan-200 rounded-full text-xs font-mono font-bold">
                    Question #{currentQuestionIndex}
                  </span>
                  {isBroadcastingLeaderboard && (
                    <span className="px-3 py-1 bg-yellow-500/20 border border-yellow-500/40 text-yellow-300 rounded-full text-xs font-bold animate-pulse">
                      🏆 LEADERBOARD DISPLAYED ON ALL SCREENS
                    </span>
                  )}
                </div>
                <h2 className="text-2xl md:text-3xl font-black text-white mt-2">
                  Live Participant Broadcast Controls
                </h2>
                <p className="text-xs text-cyan-200/70 mt-1">
                  Synchronize question flow for all 500+ participants and display real-time standings across all devices.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* BROADCAST NEXT QUESTION BUTTON */}
                <button
                  onClick={handleBroadcastNextQuestion}
                  className="btn-cyber px-6 py-4 bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 hover:from-cyan-400 hover:to-indigo-400 text-white font-black rounded-2xl shadow-xl shadow-cyan-500/30 text-sm md:text-base flex items-center gap-2 active:scale-95 transition"
                >
                  <span className="text-lg">⏭️</span>
                  <span>NEXT QUESTION</span>
                </button>

                {/* BROADCAST LEADERBOARD TOGGLE BUTTON */}
                <button
                  onClick={handleToggleBroadcastLeaderboard}
                  className={`px-5 py-4 rounded-2xl font-black text-xs md:text-sm tracking-wide transition-all duration-300 flex items-center gap-2 border shadow-lg ${
                    isBroadcastingLeaderboard
                      ? 'bg-yellow-400 text-black border-yellow-200 shadow-yellow-400/50 animate-pulse'
                      : 'bg-yellow-500/20 hover:bg-yellow-500/30 border-yellow-500/40 text-yellow-300 hover:border-yellow-400/60'
                  }`}
                >
                  <span className="text-lg">{isBroadcastingLeaderboard ? '👁️' : '🏆'}</span>
                  <span>{isBroadcastingLeaderboard ? 'HIDE LEADERBOARD FROM ALL' : 'SHOW LEADERBOARD TO ALL'}</span>
                </button>

                {/* STOP QUIZ BUTTON */}
                <button
                  onClick={stopQuiz}
                  className="px-4 py-4 rounded-2xl bg-red-950/80 border border-red-500/50 hover:bg-red-900 text-red-300 font-bold text-xs transition active:scale-95"
                >
                  ⏹️ STOP QUIZ
                </button>
              </div>
            </div>
          </div>
        )}

        {/* QUIZ ROUNDS / SETS CONTROL SECTION */}
        <div className="glass cyber-glow rounded-3xl p-6 mb-6">
          <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
            <div>
              <h2 className="text-2xl font-black text-white flex items-center gap-2">
                <span>🎯 Quiz Sets Control</span>
                {quizStarted && (
                  <span className="px-3 py-1 bg-green-500/20 border border-green-500/40 text-green-300 rounded-full text-xs font-bold animate-pulse">
                    🟢 QUIZ {activeQuizNumber} LIVE
                  </span>
                )}
              </h2>
              <p className="text-cyan-200/60 text-xs">
                Click on any Quiz below to launch it (with confirmation) or inspect questions.
              </p>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => setShowUploadModal(true)}
                className="btn-cyber px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold rounded-lg text-xs"
              >
                📥 Upload & Partition JSON
              </button>
              <button 
                onClick={repartitionExisting}
                className="px-3 py-2 bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 rounded-lg text-xs font-semibold hover:bg-cyan-500/20"
              >
                🔄 Re-Divide Quizzes
              </button>
            </div>
          </div>

          {/* Quiz Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {quizzes.map((q) => {
              const isActive = activeQuizNumber === q.quizNumber && quizStarted
              const isSelected = activeQuizNumber === q.quizNumber
              return (
                <div 
                  key={q.quizNumber}
                  className={`p-5 rounded-2xl border transition-all duration-300 relative flex flex-col justify-between ${
                    isActive 
                      ? 'bg-gradient-to-b from-green-500/20 to-emerald-500/10 border-green-500 shadow-xl shadow-green-500/20 scale-[1.02]' 
                      : isSelected
                      ? 'bg-cyan-500/15 border-cyan-400/50'
                      : 'bg-cyan-500/5 border-cyan-500/20 hover:border-cyan-500/40 hover:bg-cyan-500/10'
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs uppercase tracking-widest font-bold text-cyan-400">Round {q.quizNumber}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                        isActive ? 'bg-green-500 text-black' : q.count > 0 ? 'bg-cyan-500/20 text-cyan-300' : 'bg-gray-500/20 text-gray-400'
                      }`}>
                        {isActive ? 'ACTIVE' : `${q.count} Qs`}
                      </span>
                    </div>
                    <h3 className="text-2xl font-black text-white mb-1">{q.title}</h3>
                    <p className="text-xs text-cyan-200/60 mb-4">
                      {q.count > 0 ? `${q.count} questions configured` : 'No questions assigned'}
                    </p>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-cyan-500/10">
                    <button
                      onClick={() => handleQuizCardClick(q)}
                      disabled={q.count === 0}
                      className={`w-full py-2.5 rounded-xl font-black text-xs tracking-wider transition ${
                        isActive
                          ? 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-500/20 animate-pulse'
                          : q.count > 0
                          ? 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white shadow-md'
                          : 'bg-cyan-500/10 text-cyan-500/30 cursor-not-allowed'
                      }`}
                    >
                      {isActive ? '⏹️ STOP QUIZ' : `▶️ START ${q.title.toUpperCase()}`}
                    </button>
                    <button
                      onClick={() => viewQuizQuestions(q.quizNumber)}
                      className="w-full py-1.5 rounded-lg bg-black/30 border border-cyan-500/20 text-cyan-300 text-[11px] font-semibold hover:bg-cyan-500/10"
                    >
                      🔍 View Questions ({q.count})
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* DASHBOARD CONTROLS, TIMERS & CHEAT ALERTS */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 mb-6">
          {/* Controls & Metrics */}
          <motion.div className="glass cyber-glow rounded-2xl p-6 backdrop-blur-xl space-y-4 xl:col-span-1">
            <h3 className="text-xl font-bold text-cyan-300">⚙️ Settings & Actions</h3>
            
            {/* Timing Configuration */}
            <div className="bg-cyan-500/5 p-3.5 rounded-xl border border-cyan-500/20 space-y-3">
              <div className="text-xs font-bold text-cyan-300 uppercase tracking-wider">⏱️ Per-Question Timers</div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-cyan-200/60 mb-0.5">Answer Time (s)</label>
                  <input
                    type="number"
                    min="5"
                    max="120"
                    value={answerTimeLimit}
                    onChange={(e) => setAnswerTimeLimit(e.target.value)}
                    className="w-full px-2 py-1.5 bg-black/50 border border-cyan-500/30 rounded text-cyan-100 text-xs text-center font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-cyan-200/60 mb-0.5">Preview Time (s)</label>
                  <input
                    type="number"
                    min="2"
                    max="30"
                    value={previewTimeLimit}
                    onChange={(e) => setPreviewTimeLimit(e.target.value)}
                    className="w-full px-2 py-1.5 bg-black/50 border border-cyan-500/30 rounded text-cyan-100 text-xs text-center font-bold"
                  />
                </div>
              </div>
              <button 
                onClick={updateTimerSettings}
                className="w-full py-1.5 bg-cyan-500/20 border border-cyan-500/30 text-cyan-200 rounded text-xs font-semibold hover:bg-cyan-500/30"
              >
                Save Timer Settings
              </button>
            </div>

            <button onClick={() => setShowExports(v => !v)} className="btn-cyber w-full px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-lg text-sm">
              {showExports ? '✕ HIDE EXPORTS' : '📊 EXPORT RESULTS & CERTS'}
            </button>
            
            {showExports && (
              <div className="space-y-2 pt-3 border-t border-cyan-500/20">
                <button onClick={downloadCSV} className="btn-cyber w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-lg text-xs">📥 Export CSV</button>
                <button onClick={downloadXLSX} className="btn-cyber w-full px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold rounded-lg text-xs">📁 Export Excel (XLSX)</button>
                <div className="flex gap-2">
                  <input value={certStudent} onChange={(e) => setCertStudent(e.target.value)} placeholder="Register No." className="flex-1 min-w-0 px-3 py-2 bg-cyan-500/10 border border-cyan-500/30 rounded text-cyan-100 placeholder-cyan-400/40 text-xs focus:border-cyan-400" />
                  <button onClick={downloadCertificate} className="btn-cyber px-4 py-2 bg-gradient-to-r from-orange-600 to-red-600 text-white font-semibold rounded-lg text-xs" title="Generate PDF Certificate">🎖️ Cert</button>
                </div>
              </div>
            )}
            
            <div className="pt-2 border-t border-cyan-500/20">
              <button 
                onClick={handleHardReset} 
                className="btn-cyber w-full px-4 py-2.5 bg-red-950/80 border border-red-500/50 text-red-400 font-black tracking-widest rounded-lg hover:bg-red-900/90 transition-all hover:text-red-200 text-xs"
              >
                ⚠️ WIPE ALL DATA
              </button>
            </div>
          </motion.div>

          {/* Live Anti-Cheat Focus Loss Feed */}
          <motion.div className="xl:col-span-3 glass cyber-glow rounded-2xl p-6 backdrop-blur-xl border-l-4 border-red-500/50">
            <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
              <div>
                <h3 className="text-xl font-bold text-red-400 flex items-center gap-2">
                  <span>⚠️ Anti-Cheat & Screen Lock Controls</span>
                  {Object.keys(lockedStudents).length > 0 && (
                    <span className="px-2 py-0.5 bg-red-500 text-white rounded-full text-xs font-black animate-pulse">
                      {Object.keys(lockedStudents).length} LOCKED
                    </span>
                  )}
                </h3>
                <p className="text-[11px] text-cyan-200/60 mt-0.5">
                  Locked participants cannot answer questions until you click "Allow Participant".
                </p>
              </div>
              <button 
                onClick={() => setCheatAlerts([])} 
                className="px-3 py-1 bg-red-500/20 text-red-300 border border-red-500/40 rounded hover:bg-red-500/40 text-xs font-bold"
              >
                CLEAR LOGS
              </button>
            </div>
            <div className="space-y-2 max-h-[35vh] overflow-y-auto pr-1">
              {cheatAlerts.length === 0 ? (
                <div className="text-xs text-cyan-200/40 py-6 text-center font-mono">No suspicious activity detected. Systems normal.</div>
              ) : (
                cheatAlerts.map((alert, idx) => {
                  const isLocked = Boolean(lockedStudents[alert.registerNumber])
                  return (
                    <div key={idx} className="flex flex-wrap items-center justify-between p-3 bg-red-950/40 rounded-xl border border-red-500/30 gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-red-200 font-bold text-sm">
                            {alert.name} <span className="text-red-300/60 font-normal text-xs">({alert.registerNumber})</span>
                          </span>
                          {isLocked ? (
                            <span className="px-2 py-0.5 rounded bg-red-500/30 border border-red-500/60 text-red-300 text-[10px] font-black uppercase tracking-wider animate-pulse">
                              🔒 LOCKED
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-green-500/20 border border-green-500/40 text-green-300 text-[10px] font-bold uppercase">
                              ✅ UNLOCKED
                            </span>
                          )}
                        </div>
                        <div className="text-red-400/80 text-[10px] font-mono mt-0.5">{alert.action}</div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <div className="text-red-500/50 text-[10px] whitespace-nowrap">
                          {alert.timestamp ? new Date(alert.timestamp).toLocaleTimeString() : ''}
                        </div>
                        {isLocked && (
                          <button
                            onClick={() => handleUnlockStudent(alert.registerNumber)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs shadow-lg shadow-emerald-500/30 transition active:scale-95 flex items-center gap-1 cursor-pointer"
                          >
                            <span>🔓</span>
                            <span>ALLOW PARTICIPANT</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </motion.div>
        </div>

        {/* PARTICIPANTS MANAGEMENT TABLE */}
        <div className="grid grid-cols-1 gap-6">
          <motion.div className="glass cyber-glow rounded-2xl p-6 backdrop-blur-xl">
            <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
              <h3 className="text-xl font-bold text-cyan-300">👥 Participants Management ({students.length})</h3>
              <button 
                onClick={() => { setEditingStudent(null); setShowEditModal(true); }}
                className="px-3 py-1.5 bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 rounded hover:bg-cyan-500/40 text-xs font-bold"
              >
                + ADD STUDENT
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-cyan-100">
                <thead className="bg-cyan-900/30 text-cyan-300 uppercase font-bold text-[10px] tracking-wider">
                  <tr>
                    <th className="px-4 py-3 rounded-tl-lg">Name</th>
                    <th className="px-4 py-3">Reg. Number</th>
                    <th className="px-4 py-3">Dept</th>
                    <th className="px-4 py-3">Score</th>
                    <th className="px-4 py-3 text-right rounded-tr-lg">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cyan-500/10">
                  {students.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="text-center py-6 text-cyan-200/40">No participants registered.</td>
                    </tr>
                  ) : (
                    students.map((student) => {
                      const isLocked = Boolean(lockedStudents[student.registerNumber])
                      return (
                        <tr key={student.id} className={`transition ${isLocked ? 'bg-red-950/20' : 'hover:bg-cyan-500/5'}`}>
                          <td className="px-4 py-3 font-semibold">
                            <div className="flex items-center gap-2">
                              <span>{student.name}</span>
                              {isLocked && (
                                <span className="px-1.5 py-0.2 rounded bg-red-500/30 text-red-300 text-[9px] font-black uppercase">
                                  🔒 LOCKED
                                </span>
                              )}
                            </div>
                            <div className={student.connected ? 'text-green-400 text-[9px] mt-0.5' : 'text-cyan-200/40 text-[9px] mt-0.5'}>
                              {student.connected ? '🟢 Online' : '🔴 Offline'}
                            </div>
                          </td>
                          <td className="px-4 py-3 font-mono">{student.registerNumber}</td>
                          <td className="px-4 py-3">{student.department || '-'}</td>
                          <td className="px-4 py-3 font-bold text-blue-300">{student.score}</td>
                          <td className="px-4 py-3 text-right space-x-2">
                            {isLocked && (
                              <button 
                                onClick={() => handleUnlockStudent(student.registerNumber)}
                                className="px-2.5 py-1 rounded bg-emerald-500 text-black font-black text-[10px] shadow-sm hover:bg-emerald-400 transition"
                              >
                                🔓 Allow
                              </button>
                            )}
                            <button 
                              onClick={() => { setEditingStudent(student); setShowEditModal(true); }}
                              className="px-2 py-1 rounded bg-blue-500/20 text-blue-200 border border-blue-400/30 text-[10px] font-semibold hover:bg-blue-500/40 transition"
                            >
                              Edit
                            </button>
                            <button 
                              onClick={() => removeParticipant(student.registerNumber)} 
                              className="px-2 py-1 rounded bg-red-500/20 text-red-200 border border-red-400/30 text-[10px] font-semibold hover:bg-red-500/40 transition"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </>
  )
}
