import React, { useEffect, useMemo, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import socket from '../utils/socket'
import { getBackendUrl } from '../utils/config'

export default function QuizPage() {
  const navigate = useNavigate()
  const auth = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('studentAuth') || 'null')
    } catch {
      return null
    }
  }, [])

  const student = auth?.student
  const [question, setQuestion] = useState(null)
  const questionRef = useRef(null)
  
  // Cumulative score across all quizzes
  const [currentScore, setCurrentScore] = useState(student?.score || 0)
  
  // Timing state
  const [answerTimeLimit, setAnswerTimeLimit] = useState(15) // default 15s
  const [previewTimeLimit, setPreviewTimeLimit] = useState(5) // default 5s
  const [seconds, setSeconds] = useState(15)
  const [previewSeconds, setPreviewSeconds] = useState(5)

  const [activeQuizNumber, setActiveQuizNumber] = useState(1)
  const [status, setStatus] = useState('Checking quiz status...')
  const [selected, setSelected] = useState(null)
  const [revealed, setRevealed] = useState(null)
  const [connected, setConnected] = useState(false)
  const [quizStarted, setQuizStarted] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [progress, setProgress] = useState(null)
  
  const [showCheatWarning, setShowCheatWarning] = useState(false)
  const [showBroadcastLeaderboard, setShowBroadcastLeaderboard] = useState(false)
  const [broadcastLeaderboard, setBroadcastLeaderboard] = useState([])
  const timerRef = useRef(null)
  const previewTimerRef = useRef(null)
  const previewTimeoutRef = useRef(null)
  const selectedRef = useRef(null)
  const submittingRef = useRef(false)

  const fetchNextQuestion = async () => {
    if (!student?.registerNumber) return;
    try {
      if (timerRef.current) clearInterval(timerRef.current);
      if (previewTimerRef.current) clearInterval(previewTimerRef.current);
      if (previewTimeoutRef.current) clearTimeout(previewTimeoutRef.current);
      submittingRef.current = false;

      const res = await fetch(`${getBackendUrl()}/api/quiz/next?registerNumber=${student.registerNumber}`)
      const data = await res.json()
      
      if (data.totalScore !== undefined) {
        setCurrentScore(data.totalScore)
      }

      if (!data.quizStarted) {
        setQuizStarted(false)
        if (data.activeQuizNumber) setActiveQuizNumber(data.activeQuizNumber)
        setStatus(`Waiting for admin to start Quiz ${data.activeQuizNumber || 1}...`)
        return
      }
      
      setQuizStarted(true)
      if (data.activeQuizNumber) setActiveQuizNumber(data.activeQuizNumber)
      if (data.answerTimeLimit) setAnswerTimeLimit(data.answerTimeLimit)
      if (data.previewTimeLimit) setPreviewTimeLimit(data.previewTimeLimit)

      if (data.complete) {
        setIsComplete(true)
        setStatus(`Quiz ${data.activeQuizNumber || activeQuizNumber} Complete!`)
        setQuestion(null)
        setProgress(null)
        setRevealed(null)
        return
      }

      setIsComplete(false)
      setQuestion(data.question)
      questionRef.current = data.question
      setProgress(data.progress || null)
      
      const qTime = data.answerTimeLimit || 15
      setSeconds(qTime)
      setSelected(null)
      selectedRef.current = null
      setRevealed(null)
      setStatus('Answer now!')
      
      // Start answer timer
      if (timerRef.current) clearInterval(timerRef.current)
      timerRef.current = setInterval(() => {
        setSeconds(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current)
            handleTimeUp()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } catch (e) {
      setStatus('Error loading next question. Retrying...')
      setTimeout(fetchNextQuestion, 2000)
    }
  }

  const handleTimeUp = () => {
    if (submittingRef.current || revealed) return
    submitFinalAnswer(selectedRef.current)
  }

  const handleOptionClick = (key) => {
    if (seconds <= 0 || revealed || submittingRef.current) return
    setSelected(key)
    selectedRef.current = key
  }

  const handleManualSubmit = () => {
    if (seconds <= 0 || revealed || submittingRef.current || !selectedRef.current) return
    if (timerRef.current) clearInterval(timerRef.current)
    setSeconds(0)
    submitFinalAnswer(selectedRef.current)
  }

  const submitFinalAnswer = async (option) => {
    const currentQ = questionRef.current
    if (!currentQ || !student) return
    
    if (submittingRef.current || revealed) return
    submittingRef.current = true

    if (timerRef.current) clearInterval(timerRef.current)
    setStatus('Submitting answer...')

    const timeMs = (answerTimeLimit - Math.max(0, seconds)) * 1000
    
    try {
      const res = await fetch(`${getBackendUrl()}/api/quiz/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registerNumber: student.registerNumber,
          questionId: currentQ.id,
          option: option || 'TIMEOUT',
          timeMs
        })
      })
      const data = await res.json()
      
      if (data.success) {
        setRevealed(data)
        if (data.totalScore !== undefined) {
          setCurrentScore(data.totalScore)
        }
        setStatus('Answer recorded! Waiting for Admin to broadcast next question...')
        socket.emit('leaderboard:refresh')
      } else {
        setStatus('Error: ' + (data.error || 'Unknown error'))
        setTimeout(fetchNextQuestion, 2000)
      }
    } catch (e) {
      setStatus('Network error submitting. Please hold...')
      setTimeout(fetchNextQuestion, 3000)
    }
  }

  useEffect(() => {
    if (!student?.registerNumber) {
      navigate('/register')
      return
    }

    const handleJoin = () => {
      socket.emit('student:join', { registerNumber: student.registerNumber })
      setConnected(true)
    }

    socket.on('connect', handleJoin)
    if (socket.connected) handleJoin()
    
    socket.on('quiz:start', (payload) => {
      setQuizStarted(true)
      setIsComplete(false)
      setShowBroadcastLeaderboard(false)
      if (payload?.quizNumber) setActiveQuizNumber(payload.quizNumber)
      if (payload?.answerTimeLimit) setAnswerTimeLimit(payload.answerTimeLimit)
      if (payload?.previewTimeLimit) setPreviewTimeLimit(payload.previewTimeLimit)
      fetchNextQuestion()
    })

    socket.on('quiz:nextQuestion', () => {
      setShowBroadcastLeaderboard(false)
      fetchNextQuestion()
    })

    socket.on('leaderboard:display', (payload) => {
      setShowBroadcastLeaderboard(Boolean(payload?.show))
      if (payload?.leaderboard) {
        setBroadcastLeaderboard(payload.leaderboard)
      }
    })
    
    socket.on('quiz:stop', (payload) => {
      setQuizStarted(false)
      setShowBroadcastLeaderboard(false)
      if (timerRef.current) clearInterval(timerRef.current)
      if (previewTimerRef.current) clearInterval(previewTimerRef.current)
      setStatus(`Quiz ${payload?.quizNumber || activeQuizNumber} stopped by admin.`)
    })

    socket.on('student:kicked', () => {
      localStorage.removeItem('studentAuth')
      navigate('/register')
    })

    // Initial fetch
    fetchNextQuestion()

    // Anti-cheat mechanisms
    const handleBlur = () => {
      if (quizStarted && !isComplete) {
        setShowCheatWarning(true)
        socket.emit('student:cheat_alert', { 
          registerNumber: student.registerNumber,
          action: 'Window focus lost (switched tabs or apps)'
        })
      }
    }

    const handleBeforeUnload = (e) => {
      if (quizStarted && !isComplete) {
        e.preventDefault()
        e.returnValue = 'Are you sure you want to leave? Your progress may be interrupted.'
      }
    }

    window.addEventListener('blur', handleBlur)
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      socket.off('connect', handleJoin)
      socket.off('quiz:start')
      socket.off('quiz:nextQuestion')
      socket.off('leaderboard:display')
      socket.off('quiz:stop')
      socket.off('student:kicked')
      if (timerRef.current) clearInterval(timerRef.current)
      if (previewTimerRef.current) clearInterval(previewTimerRef.current)
      window.removeEventListener('blur', handleBlur)
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [student?.registerNumber, navigate, quizStarted, isComplete])

  const logout = () => {
    if (window.confirm('Are you sure you want to exit?')) {
      localStorage.removeItem('studentAuth')
      navigate('/register')
    }
  }

  return (
    <div className="content-wrapper page-shell min-h-[100dvh] flex flex-col">
      {/* Cheat Warning Overlay */}
      {showCheatWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-red-950/95 backdrop-blur-md">
          <div className="glass cyber-glow border-red-500 rounded-2xl max-w-sm w-full p-8 text-center bg-red-900/50">
            <h2 className="text-3xl font-black text-red-400 mb-4 animate-pulse">WARNING</h2>
            <p className="text-red-200 mb-6 font-semibold">
              You left the quiz window. This action has been recorded and flagged to the administrator.
            </p>
            <button onClick={() => setShowCheatWarning(false)} className="btn-cyber w-full py-4 bg-red-600 text-white font-bold rounded-xl hover:bg-red-500 text-lg">
              I UNDERSTAND
            </button>
          </div>
        </div>
      )}

      {/* Glow overlays */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-10 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="z-10 w-full max-w-md mx-auto flex-1 flex flex-col">
        <div className="glass cyber-glow rounded-none border-x-0 md:border-x md:rounded-3xl md:my-6 flex-1 p-5 md:p-8 space-y-6 flex flex-col">
          {/* Student Header with Live Total Cumulative Score */}
          <div className="flex items-center justify-between gap-4 flex-wrap pb-2 border-b border-cyan-500/15">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-black bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">QUIZ ROOM</h1>
                <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-black">
                  QUIZ {activeQuizNumber}
                </span>
              </div>
              <p className="text-cyan-200/60 text-xs mt-1 font-semibold">{student?.name} • {connected ? '🟢 Online' : '🔴 Offline'}</p>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border border-yellow-500/40 text-center">
                <span className="block text-[9px] text-yellow-300/80 font-bold uppercase tracking-widest">Total Score</span>
                <span className="text-sm font-black text-yellow-300 font-mono">{currentScore} pts</span>
              </div>
              <button onClick={logout} className="px-2.5 py-2 rounded-lg bg-red-500/20 text-red-200 border border-red-400/30 text-xs font-bold hover:bg-red-500/40">Exit</button>
            </div>
          </div>

          {!quizStarted ? (
            <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-8 text-center text-cyan-200/70 font-medium">
              <div className="text-4xl mb-4 animate-bounce">⏳</div>
              <h3 className="text-xl font-bold text-cyan-300 mb-2">Waiting for Admin</h3>
              <p className="text-sm mb-4">The administrator has not started Quiz {activeQuizNumber} yet. Please wait on this screen...</p>
              <div className="inline-block px-4 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-mono">
                Your Current Cumulative Score: <strong>{currentScore} pts</strong>
              </div>
            </div>
          ) : isComplete ? (
            <div className="rounded-2xl border border-green-500/30 bg-green-500/10 p-8 text-center text-green-300 font-medium">
              <div className="text-5xl mb-4">🎉</div>
              <h2 className="text-2xl font-black mb-1">Quiz {activeQuizNumber} Complete!</h2>
              <div className="my-4 p-4 rounded-2xl bg-black/40 border border-green-500/30">
                <span className="text-xs text-green-200/70 block mb-1 uppercase tracking-widest">Total Cumulative Score</span>
                <span className="text-4xl font-black text-yellow-300 font-mono">{currentScore} pts</span>
              </div>
              <p className="text-green-200/70 text-xs mb-6">
                Your score carries forward seamlessly into the next quiz! Waiting for the admin to launch Quiz {Number(activeQuizNumber) + 1}...
              </p>
              <button onClick={() => navigate('/leaderboard')} className="btn-cyber px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold rounded-lg text-sm w-full">
                View Live Leaderboard
              </button>
            </div>
          ) : !question ? (
            <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-8 text-center text-cyan-200/70 font-medium animate-pulse">
              Loading next question...
            </div>
          ) : (
            <>
              {/* Premium Live Timer Bar (15s Answer Timer) */}
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm text-cyan-200/70">
                  <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
                    {revealed ? `Reviewing (${previewSeconds}s remaining)` : status}
                  </span>
                  <span className={`px-3 py-1 rounded-full font-black text-xs border transition-colors ${
                    revealed 
                      ? 'bg-blue-500/20 border-blue-500/40 text-blue-300'
                      : seconds > 5 
                      ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300' 
                      : 'bg-red-500/20 border-red-500/40 text-red-300 animate-pulse'
                  }`}>
                    {revealed ? `Next in ${previewSeconds}s` : seconds > 0 ? `${seconds}s` : 'Time Expired'}
                  </span>
                </div>
                
                {/* 15s Timer Bar / 5s Preview Bar */}
                <div className="w-full bg-black/40 h-2.5 rounded-full overflow-hidden border border-cyan-500/20">
                  {revealed ? (
                    <div 
                      className="h-full bg-gradient-to-r from-blue-400 to-cyan-400 transition-all duration-1000 linear" 
                      style={{ width: `${(previewSeconds / (previewTimeLimit || 5)) * 100}%` }}
                    />
                  ) : (
                    <div 
                      className={`h-full transition-all duration-1000 linear ${seconds > 5 ? 'bg-gradient-to-r from-cyan-400 to-blue-500' : 'bg-red-500'}`} 
                      style={{ width: `${(seconds / (answerTimeLimit || 15)) * 100}%` }}
                    />
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  {progress && (
                    <div className="text-cyan-400 font-bold text-xs tracking-widest uppercase">
                      Quiz {progress.quizNumber} • Q {progress.current} of {progress.total}
                    </div>
                  )}
                  <div className="text-cyan-300/60 font-mono text-xs">
                    +{question.points || 10} pts
                  </div>
                </div>

                <div className="text-xl md:text-2xl font-bold text-white leading-relaxed">{question.question}</div>
                
                <div className="space-y-3 pt-2">
                  {[
                    ['A', question.optionA],
                    ['B', question.optionB],
                    ['C', question.optionC],
                    ['D', question.optionD],
                  ].map(([key, value]) => {
                    const active = selected === key
                    const isCorrect = revealed?.correct === key
                    const isWrongSelected = revealed && active && !isCorrect
                    const isTimeUp = seconds <= 0
                    
                    let btnStyle = 'bg-black/20 border-cyan-500/20 text-cyan-200 hover:bg-cyan-500/10 hover:border-cyan-500/40'
                    if (isCorrect) btnStyle = 'bg-green-500/20 border-green-500/50 text-green-100 shadow-[0_0_15px_rgba(34,197,94,0.2)]'
                    else if (isWrongSelected) btnStyle = 'bg-red-500/20 border-red-500/50 text-red-100'
                    else if (active) btnStyle = 'bg-cyan-500/20 border-cyan-400/50 text-cyan-100'
                    else if ((revealed || isTimeUp) && !active) btnStyle = 'bg-black/10 border-cyan-500/10 text-cyan-200/40 opacity-50 cursor-not-allowed'

                    return (
                      <button
                        key={key}
                        onClick={() => handleOptionClick(key)}
                        disabled={isTimeUp || !!revealed}
                        className={`w-full text-left px-5 py-4 rounded-2xl border-2 transition-all duration-300 flex items-start active:scale-[0.98] ${btnStyle}`}
                      >
                        <span className={`font-black mr-4 text-lg ${isCorrect ? 'text-green-400' : isWrongSelected ? 'text-red-400' : active ? 'text-cyan-300' : 'text-cyan-500'}`}>{key}.</span>
                        <span className="font-medium text-lg leading-snug">{value}</span>
                      </button>
                    )
                  })}
                </div>
                
                {/* Manual Submit Button */}
                {!revealed && seconds > 0 && (
                  <button
                    onClick={handleManualSubmit}
                    disabled={!selected}
                    className={`w-full mt-4 py-4 rounded-2xl font-black text-lg tracking-wider transition-all duration-300 ${selected ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/20 active:scale-95 cursor-pointer' : 'bg-cyan-500/10 text-cyan-500/30 border border-cyan-500/20 cursor-not-allowed'}`}
                  >
                    SUBMIT ANSWER
                  </button>
                )}

                {/* Explanation / Waiting for Admin Display */}
                {revealed && (
                  <div className="mt-6 rounded-2xl border border-cyan-500/40 bg-gradient-to-b from-cyan-500/15 to-blue-500/10 p-5 text-cyan-100 animate-fade-in-up shadow-xl">
                    <div className="flex justify-between items-center mb-3">
                      <div className="font-black text-sm text-cyan-400 uppercase tracking-widest flex items-center gap-2">
                        <span>{revealed.isCorrect ? '✅ Correct Answer!' : '❌ Incorrect'}</span>
                        {revealed.isCorrect && (
                          <span className="px-2.5 py-0.5 bg-green-500/20 text-green-300 border border-green-500/40 rounded text-xs font-mono font-bold">
                            +{revealed.pointsAwarded || 10} pts
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 px-3 py-1 bg-cyan-500/20 border border-cyan-500/40 rounded-full">
                        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                        <span className="text-[11px] font-mono font-bold text-cyan-300 uppercase tracking-wider">
                          Waiting for host...
                        </span>
                      </div>
                    </div>
                    
                    {revealed.explanation && (
                      <div className="text-sm leading-relaxed text-cyan-50 mb-3 bg-black/30 p-3.5 rounded-xl border border-cyan-500/20">
                        {revealed.explanation}
                      </div>
                    )}

                    {revealed.fact && (
                      <div className="pt-2 text-xs text-cyan-300/80">
                        <span className="font-bold text-cyan-300">💡 Did you know?</span> {revealed.fact}
                      </div>
                    )}

                    <div className="mt-4 pt-3 border-t border-cyan-500/20 flex items-center justify-between text-xs text-cyan-200/70">
                      <span className="flex items-center gap-2">
                        <span className="text-base">⏳</span> Stand by! The host will broadcast the next question shortly.
                      </span>
                      <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 font-mono font-bold">
                        ROUND {progress?.quizNumber || activeQuizNumber}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* FULL-SCREEN BROADCAST LEADERBOARD OVERLAY (Triggered by Admin) */}
      {showBroadcastLeaderboard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 bg-black/90 backdrop-blur-xl animate-fade-in-up">
          <div className="glass cyber-glow border-2 border-yellow-500/40 bg-gradient-to-b from-yellow-950/40 via-cyan-950/60 to-black rounded-3xl max-w-2xl w-full p-6 md:p-8 relative max-h-[90vh] flex flex-col shadow-2xl shadow-yellow-500/20">
            {/* Header */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-yellow-500/20 border border-yellow-500/40 text-yellow-300 rounded-full text-xs font-black uppercase tracking-widest mb-2 animate-pulse">
                <span>🏆 LIVE BROADCAST FROM HOST</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-black bg-gradient-to-r from-yellow-300 via-amber-200 to-yellow-400 bg-clip-text text-transparent">
                LEADERBOARD
              </h2>
              <p className="text-cyan-200/60 text-xs mt-1">
                Real-time standings across all participants • Stand by for next round
              </p>
            </div>

            {/* Top 3 Podium (if at least 1 student exists) */}
            {broadcastLeaderboard.length > 0 && (
              <div className="grid grid-cols-3 gap-2 md:gap-3 mb-4">
                {/* 2nd Place */}
                {broadcastLeaderboard[1] ? (
                  <div className="bg-gradient-to-b from-slate-400/20 to-slate-600/10 border border-slate-400/40 rounded-2xl p-3 text-center flex flex-col justify-between order-1">
                    <div>
                      <div className="text-2xl">🥈</div>
                      <div className="text-[10px] font-black uppercase text-slate-300 tracking-wider mt-1">2ND PLACE</div>
                      <div className="font-bold text-white text-xs md:text-sm truncate mt-0.5">{broadcastLeaderboard[1].name}</div>
                    </div>
                    <div className="text-xs font-mono font-black text-cyan-300 mt-2">{broadcastLeaderboard[1].score} pts</div>
                  </div>
                ) : <div className="order-1" />}

                {/* 1st Place */}
                {broadcastLeaderboard[0] ? (
                  <div className="bg-gradient-to-b from-yellow-500/30 to-amber-600/15 border-2 border-yellow-400/60 rounded-2xl p-3 text-center flex flex-col justify-between order-2 shadow-lg shadow-yellow-500/20 scale-105">
                    <div>
                      <div className="text-3xl animate-bounce">👑</div>
                      <div className="text-[10px] font-black uppercase text-yellow-300 tracking-wider mt-1">1ST PLACE</div>
                      <div className="font-black text-white text-sm md:text-base truncate mt-0.5">{broadcastLeaderboard[0].name}</div>
                    </div>
                    <div className="text-sm font-mono font-black text-yellow-300 mt-2">{broadcastLeaderboard[0].score} pts</div>
                  </div>
                ) : <div className="order-2" />}

                {/* 3rd Place */}
                {broadcastLeaderboard[2] ? (
                  <div className="bg-gradient-to-b from-amber-700/20 to-amber-900/10 border border-amber-600/40 rounded-2xl p-3 text-center flex flex-col justify-between order-3">
                    <div>
                      <div className="text-2xl">🥉</div>
                      <div className="text-[10px] font-black uppercase text-amber-400 tracking-wider mt-1">3RD PLACE</div>
                      <div className="font-bold text-white text-xs md:text-sm truncate mt-0.5">{broadcastLeaderboard[2].name}</div>
                    </div>
                    <div className="text-xs font-mono font-black text-cyan-300 mt-2">{broadcastLeaderboard[2].score} pts</div>
                  </div>
                ) : <div className="order-3" />}
              </div>
            )}

            {/* Scrollable Rankings List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {broadcastLeaderboard.slice(3).map((item, idx) => {
                const isMe = item.registerNumber === student?.registerNumber
                return (
                  <div
                    key={item.id || idx}
                    className={`flex items-center justify-between p-3 rounded-xl border transition ${
                      isMe
                        ? 'bg-cyan-500/20 border-cyan-400 text-white shadow-md shadow-cyan-500/20'
                        : 'bg-black/30 border-cyan-500/10 text-cyan-100 hover:bg-cyan-500/5'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 text-center font-mono font-black text-xs text-cyan-400">
                        #{idx + 4}
                      </span>
                      <div>
                        <div className="font-bold text-sm flex items-center gap-2">
                          <span>{item.name}</span>
                          {isMe && (
                            <span className="px-1.5 py-0.2 bg-cyan-400 text-black text-[9px] font-black rounded uppercase">YOU</span>
                          )}
                        </div>
                        <div className="text-[10px] text-cyan-200/60 font-mono">{item.registerNumber} {item.department ? `• ${item.department}` : ''}</div>
                      </div>
                    </div>
                    <div className="font-mono font-black text-sm text-yellow-300">
                      {item.score} <span className="text-[10px] text-cyan-200/60 font-normal">pts</span>
                    </div>
                  </div>
                )
              })}

              {broadcastLeaderboard.length === 0 && (
                <div className="text-center py-8 text-cyan-200/60 text-sm font-mono">
                  No scores recorded yet in this round.
                </div>
              )}
            </div>

            {/* Sticky Student Status Footer */}
            <div className="mt-4 pt-3 border-t border-cyan-500/20 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-yellow-400 animate-ping" />
                <span className="text-cyan-200 font-semibold">
                  Your Current Score: <span className="text-yellow-300 font-mono font-bold">{currentScore} pts</span>
                </span>
              </div>
              <span className="text-[11px] font-mono text-cyan-400/80">
                Waiting for host to continue...
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
