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
  const [seconds, setSeconds] = useState(10)
  const [status, setStatus] = useState('Checking quiz status...')
  const [selected, setSelected] = useState(null)
  const [revealed, setRevealed] = useState(null)
  const [connected, setConnected] = useState(false)
  const [quizStarted, setQuizStarted] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [progress, setProgress] = useState(null)
  
  const [showCheatWarning, setShowCheatWarning] = useState(false)
  const timerRef = useRef(null)
  const selectedRef = useRef(null)

  const fetchNextQuestion = async () => {
    if (!student?.registerNumber) return;
    try {
      const res = await fetch(`${getBackendUrl()}/api/quiz/next?registerNumber=${student.registerNumber}`)
      const data = await res.json()
      
      if (!data.quizStarted) {
        setQuizStarted(false)
        setStatus('Waiting for admin to start the quiz...')
        return
      }
      
      setQuizStarted(true)
      
      if (data.complete) {
        setIsComplete(true)
        setStatus('Quiz Complete! Check the leaderboard.')
        setQuestion(null)
        setProgress(null)
        return
      }

      setQuestion(data.question)
      questionRef.current = data.question
      setProgress(data.progress || null)
      setSeconds(10)
      setSelected(null)
      selectedRef.current = null
      setRevealed(null)
      setStatus('Answer now!')
      
      // Start local timer
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
    submitFinalAnswer(selectedRef.current)
  }

  const handleOptionClick = (key) => {
    if (seconds <= 0 || revealed) return
    setSelected(key)
    selectedRef.current = key
  }

  const handleManualSubmit = () => {
    if (seconds <= 0 || revealed || !selectedRef.current) return
    if (timerRef.current) clearInterval(timerRef.current)
    setSeconds(0)
    submitFinalAnswer(selectedRef.current)
  }

  const submitFinalAnswer = async (option) => {
    const currentQ = questionRef.current
    if (!currentQ || !student) return
    
    // Prevent double submission
    if (revealed) return

    setStatus('Submitting answer...')

    const timeMs = 10000 // 10s max
    
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
        setStatus('Waiting for next question...')
        socket.emit('leaderboard:refresh')
        
        // Wait 4 seconds then fetch next
        setTimeout(fetchNextQuestion, 4000)
      } else {
        // Handle error (e.g., already answered)
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
    
    socket.on('quiz:start', () => {
      setQuizStarted(true)
      fetchNextQuestion()
    })
    
    socket.on('quiz:stop', () => {
      setQuizStarted(false)
      if (timerRef.current) clearInterval(timerRef.current)
      setStatus('Quiz stopped by admin.')
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
      socket.off('quiz:stop')
      socket.off('student:kicked')
      if (timerRef.current) clearInterval(timerRef.current)
      window.removeEventListener('blur', handleBlur)
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [student, navigate, quizStarted, isComplete])

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
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-3xl font-black bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">QUIZ ROOM</h1>
              <p className="text-cyan-200/60 text-xs mt-1 font-semibold">{student?.name} • {connected ? '🟢 Online' : '🔴 Offline'}</p>
            </div>
            <button onClick={logout} className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-200 border border-red-400/30 text-xs font-bold hover:bg-red-500/40">Exit</button>
          </div>

          {!quizStarted ? (
            <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-8 text-center text-cyan-200/70 font-medium">
              <div className="text-4xl mb-4 animate-bounce">⏳</div>
              Waiting for the admin to start the quiz...
            </div>
          ) : isComplete ? (
            <div className="rounded-2xl border border-green-500/30 bg-green-500/10 p-8 text-center text-green-300 font-medium">
              <div className="text-5xl mb-4">🎉</div>
              <h2 className="text-2xl font-black mb-2">Quiz Complete!</h2>
              <p className="text-green-200/70 text-sm mb-6">You have answered all questions. Check out the leaderboard to see your rank.</p>
              <button onClick={() => navigate('/leaderboard')} className="btn-cyber px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold rounded-lg text-sm w-full">
                View Leaderboard
              </button>
            </div>
          ) : !question ? (
            <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-8 text-center text-cyan-200/70 font-medium animate-pulse">
              Loading next question...
            </div>
          ) : (
            <>
              {/* Premium Live Timer Bar */}
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm text-cyan-200/70">
                  <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
                    {status}
                  </span>
                  <span className={`px-3 py-1 rounded-full font-black text-xs border transition-colors ${seconds > 5 ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300' : 'bg-red-500/20 border-red-500/40 text-red-300 animate-pulse'}`}>
                    {seconds > 0 ? `${seconds}s` : 'Time Expired'}
                  </span>
                </div>
                <div className="w-full bg-black/40 h-2 rounded-full overflow-hidden border border-cyan-500/20">
                  <div className={`h-full transition-all duration-1000 linear ${seconds > 3 ? 'bg-gradient-to-r from-cyan-400 to-blue-500' : 'bg-red-500'}`} style={{ width: `${(seconds / 10) * 100}%` }}></div>
                </div>
              </div>

              <div className="space-y-4">
                {progress && (
                  <div className="text-cyan-400 font-bold text-sm tracking-widest uppercase mb-2">
                    Question {progress.current} of {progress.total}
                  </div>
                )}
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
                    className={`w-full mt-4 py-4 rounded-2xl font-black text-lg tracking-wider transition-all duration-300 ${selected ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/20 active:scale-95' : 'bg-cyan-500/10 text-cyan-500/30 border border-cyan-500/20 cursor-not-allowed'}`}
                  >
                    SUBMIT ANSWER
                  </button>
                )}

                {revealed && (
                  <div className="mt-6 rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-5 text-cyan-100 animate-fade-in-up">
                    <div className="font-black text-sm text-cyan-400 uppercase tracking-widest mb-1">Explanation</div>
                    <div className="text-sm leading-relaxed text-cyan-50">{revealed.explanation}</div>
                    {revealed.fact && (
                      <div className="mt-4 pt-3 border-t border-cyan-500/20 text-xs text-cyan-300/80">
                        <span className="font-bold">💡 Did you know?</span> {revealed.fact}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
