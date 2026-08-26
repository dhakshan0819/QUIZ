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
        <p className="text-center text-cyan-200/60 mb-6">Enter the admin username and password</p>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-cyan-300 text-sm font-semibold mb-2">Username</label>
            <input value={username} onChange={(e) => setUsername(e.target.value)} className="w-full px-4 py-3 bg-cyan-500/5 border border-cyan-500/30 rounded-lg text-cyan-100 placeholder-cyan-400/40" placeholder="Admin username" />
          </div>
          <div>
            <label className="block text-cyan-300 text-sm font-semibold mb-2">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-3 bg-cyan-500/5 border border-cyan-500/30 rounded-lg text-cyan-100 placeholder-cyan-400/40" placeholder="Admin password" />
          </div>
          {message && <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-100">{message}</div>}
          <button disabled={busy} className="btn-cyber w-full px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold rounded-lg animate-pulse">
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
  const [showExports, setShowExports] = useState(false)
  const [certStudent, setCertStudent] = useState('')
  const [showQR, setShowQR] = useState(false)
  const [qrInfo, setQrInfo] = useState({ qrCode: '', url: '' })
  const [quizStarted, setQuizStarted] = useState(false)
  const [cheatAlerts, setCheatAlerts] = useState([])
  const [editingStudent, setEditingStudent] = useState(undefined)
  const [showEditModal, setShowEditModal] = useState(false)

  const refreshData = () => {
    fetch(`${getBackendUrl()}/api/students`)
      .then(r => r.json())
      .then(j => setStudents(j.students || []))
      .catch(err => console.error(err))
    
    fetch(`${getBackendUrl()}/api/quiz/status`)
      .then(r => r.json())
      .then(j => setQuizStarted(j.quizStarted || false))
      .catch(err => console.error(err))
  }

  useEffect(() => {
    if (!adminToken) return
    refreshData()

    const handleLobbyUpdate = () => refreshData()

    socket.emit('student:join', { registerNumber: 'ADMIN' })
    socket.on('lobby:update', handleLobbyUpdate)
    socket.on('leaderboard:update', handleLobbyUpdate)
    socket.on('quiz:start', () => setQuizStarted(true))
    socket.on('quiz:stop', () => setQuizStarted(false))
    socket.on('admin:cheat_alert', (payload) => {
      setCheatAlerts(prev => [payload, ...prev].slice(0, 50)) // Keep last 50 alerts
    })

    return () => {
      socket.off('lobby:update', handleLobbyUpdate)
      socket.off('leaderboard:update', handleLobbyUpdate)
      socket.off('quiz:start')
      socket.off('quiz:stop')
      socket.off('admin:cheat_alert')
    }
  }, [adminToken])

  const toggleQuiz = async () => {
    try {
      const endpoint = quizStarted ? '/api/quiz/stop' : '/api/quiz/start'
      await fetch(`${getBackendUrl()}${endpoint}`, { method: 'POST' })
      setQuizStarted(!quizStarted)
      socket.emit(quizStarted ? 'admin:stopQuiz' : 'admin:startQuiz')
    } catch(e) {
      console.error(e)
    }
  }

  const removeParticipant = (registerNumber) => {
    if (!window.confirm(`Are you absolutely sure you want to remove ${registerNumber} and wipe their answers?`)) return
    
    fetch(`${getBackendUrl()}/api/students/${registerNumber}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
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
        <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 left-10 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>

        {/* Modals */}
        {showEditModal && (
          <EditStudentModal 
            student={editingStudent} 
            adminToken={adminToken} 
            onClose={() => setShowEditModal(false)} 
            onRefresh={refreshData} 
          />
        )}

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

        <div className="mb-8 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-5xl md:text-6xl font-black bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-300 bg-clip-text text-transparent mb-2">ADMIN PANEL</h1>
            <p className="text-cyan-200/60">Control automated quiz flow • Manage participants • Export results</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => window.open('/leaderboard', '_blank')} className="px-4 py-2 rounded-lg bg-yellow-500/20 text-yellow-300 border border-yellow-400/30 font-bold hover:bg-yellow-500/30 transition shadow-lg shadow-yellow-500/10">🏆 Leaderboard</button>
            <button onClick={openQRModal} className="px-4 py-2 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 font-bold hover:bg-cyan-500/30 transition shadow-lg shadow-cyan-500/10">🔗 Join QR</button>
            <button onClick={logout} className="px-4 py-2 rounded-lg bg-red-500/20 text-red-200 border border-red-400/30 font-semibold hover:bg-red-500/30">Logout</button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 mb-6">
          {/* Controls & Metrics */}
          <motion.div className="glass cyber-glow rounded-2xl p-6 backdrop-blur-xl space-y-4 xl:col-span-1">
            <h3 className="text-xl font-bold text-cyan-300">🛡️ Controls</h3>
            
            <button 
              onClick={toggleQuiz} 
              className={`btn-cyber w-full px-4 py-4 text-white font-bold rounded-lg shadow-lg ${quizStarted ? 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 shadow-red-500/20 animate-pulse' : 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 shadow-green-500/20'}`}
            >
              {quizStarted ? '⏹️ STOP GLOBAL QUIZ' : '▶️ START GLOBAL QUIZ'}
            </button>

            <button onClick={() => setShowExports(v => !v)} className="btn-cyber w-full px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-lg">{showExports ? '✕ HIDE EXPORTS' : '📊 SHOW EXPORTS'}</button>
            
            {showExports && (
              <div className="space-y-2 pt-3 border-t border-cyan-500/20">
                <button onClick={downloadCSV} className="btn-cyber w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-lg text-sm">📥 Export CSV</button>
                <button onClick={downloadXLSX} className="btn-cyber w-full px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold rounded-lg text-sm">📁 Export Excel (XLSX)</button>
                <div className="flex gap-2">
                  <input value={certStudent} onChange={(e) => setCertStudent(e.target.value)} placeholder="Register No." className="flex-1 min-w-0 px-3 py-2 bg-cyan-500/10 border border-cyan-500/30 rounded text-cyan-100 placeholder-cyan-400/40 text-sm focus:border-cyan-400" />
                  <button onClick={downloadCertificate} className="btn-cyber px-4 py-2 bg-gradient-to-r from-orange-600 to-red-600 text-white font-semibold rounded-lg text-sm" title="Generate PDF Certificate">🎖️ Cert</button>
                </div>
              </div>
            )}
            
            <div className="pt-4 border-t border-cyan-500/20 mt-4">
              <button 
                onClick={handleHardReset} 
                className="btn-cyber w-full px-4 py-3 bg-red-950/80 border border-red-500/50 text-red-400 font-black tracking-widest rounded-lg hover:bg-red-900/90 transition-all hover:text-red-200"
              >
                ⚠️ WIPE ALL DATA ⚠️
              </button>
            </div>
          </motion.div>

          {/* Cheat Alerts */}
          <motion.div className="xl:col-span-3 glass cyber-glow rounded-2xl p-6 backdrop-blur-xl border-l-4 border-red-500/50">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-red-400 flex items-center gap-2">⚠️ Cheat Alerts / Focus Loss Feed</h3>
              <button 
                onClick={() => setCheatAlerts([])} 
                className="px-3 py-1 bg-red-500/20 text-red-300 border border-red-500/40 rounded hover:bg-red-500/40 text-sm font-bold"
              >
                CLEAR LOGS
              </button>
            </div>
            <div className="space-y-2 max-h-[30vh] overflow-y-auto pr-1">
              {cheatAlerts.length === 0 ? (
                <div className="text-xs text-cyan-200/40 py-4 font-mono">No suspicious activity detected. Systems normal.</div>
              ) : (
                cheatAlerts.map((alert, idx) => (
                  <div key={idx} className="flex flex-wrap items-center justify-between p-3 bg-red-950/40 rounded-lg border border-red-500/30">
                    <div className="min-w-0 flex-1">
                      <div className="text-red-200 font-bold truncate">
                        {alert.name} <span className="text-red-300/60 font-normal">({alert.registerNumber})</span>
                      </div>
                      <div className="text-red-400/80 text-[10px] font-mono">{alert.action}</div>
                    </div>
                    <div className="text-red-500/50 text-[10px] whitespace-nowrap pl-4">
                      {new Date(alert.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </div>

        {/* Participants CRUD */}
        <div className="grid grid-cols-1 gap-6">
          <motion.div className="glass cyber-glow rounded-2xl p-6 backdrop-blur-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-cyan-300">👥 Participants Management ({students.length})</h3>
              <button 
                onClick={() => { setEditingStudent(null); setShowEditModal(true); }}
                className="px-3 py-1 bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 rounded hover:bg-cyan-500/40 text-sm font-bold"
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
                    students.map((student) => (
                      <tr key={student.id} className="hover:bg-cyan-500/5 transition">
                        <td className="px-4 py-3 font-semibold">
                          {student.name}
                          <div className={student.connected ? 'text-green-400 text-[9px] mt-0.5' : 'text-cyan-200/40 text-[9px] mt-0.5'}>{student.connected ? 'Online' : 'Offline'}</div>
                        </td>
                        <td className="px-4 py-3 font-mono">{student.registerNumber}</td>
                        <td className="px-4 py-3">{student.department || '-'}</td>
                        <td className="px-4 py-3 font-bold text-blue-300">{student.score}</td>
                        <td className="px-4 py-3 text-right space-x-2">
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
                    ))
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
