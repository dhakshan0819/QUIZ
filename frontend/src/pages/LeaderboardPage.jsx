import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import socket from '../utils/socket'

const ParticleBackground = () => {
  const [particles, setParticles] = useState([])

  useEffect(() => {
    const newParticles = Array.from({ length: 15 }).map((_, i) => ({
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
          style={{
            left: `${p.left}%`,
            top: `${p.top}%`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  )
}

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState([])
  const [alerts, setAlerts] = useState([])

  useEffect(() => {
    // Listen for leaderboard updates
    socket.on('leaderboard:update', (payload) => setLeaderboard(payload.leaderboard || []))
    
    // Listen for cheat alerts
    socket.on('admin:cheat_alert', (payload) => {
      const id = Date.now() + Math.random().toString(36).substr(2, 9)
      setAlerts(prev => [...prev, { ...payload, id }])

      // Auto-remove after 6 seconds
      setTimeout(() => {
        setAlerts(prev => prev.filter(a => a.id !== id))
      }, 6000)
    })

    // Fetch initial leaderboard on mount
    socket.emit('leaderboard:refresh')

    return () => {
      socket.off('leaderboard:update')
      socket.off('admin:cheat_alert')
    }
  }, [])

  const removeAlert = (id) => {
    setAlerts(prev => prev.filter(a => a.id !== id))
  }

  const getRankedLeaderboard = () => {
    let currentRank = 1;
    let previousScore = null;
    return leaderboard.map((item, index) => {
      if (previousScore !== null && item.score < previousScore) {
        currentRank = index + 1;
      }
      previousScore = item.score;
      return { ...item, displayRank: currentRank };
    });
  }

  const rankedLeaderboard = getRankedLeaderboard();

  return (
    <>
      <ParticleBackground />

      {/* Toast notifications container */}
      <div className="fixed top-6 right-6 z-50 flex flex-col gap-3 w-full max-w-sm px-4">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className="glass border-red-500 bg-red-950/90 text-white rounded-xl p-4 shadow-xl border-l-4 border-l-red-500 flex items-start justify-between animate-slide-left relative overflow-hidden"
          >
            {/* Decorative pulsing red background */}
            <div className="absolute inset-0 bg-red-500/5 animate-pulse pointer-events-none" />
            
            <div className="flex gap-3 relative z-10">
              <span className="text-2xl">⚠️</span>
              <div>
                <div className="font-black text-red-400 text-xs tracking-wider uppercase">CHEAT ALERT</div>
                <div className="font-bold text-white text-base mt-0.5">{alert.name}</div>
                <div className="text-red-300/80 text-[10px] mt-1 font-mono">{alert.action}</div>
              </div>
            </div>
            
            <button
              onClick={() => removeAlert(alert.id)}
              className="text-red-400 hover:text-white transition-colors ml-4 text-lg font-black relative z-10"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <div className="content-wrapper page-shell min-h-screen p-4 md:p-8 flex flex-col items-center">
        {/* Glow overlays */}
        <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
          <div className="absolute top-10 left-10 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-20 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>

        <div className="z-10 w-full max-w-4xl animate-fade-in-up">
          <div className="text-center mb-10">
            <h1 className="text-5xl md:text-7xl font-black bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-300 bg-clip-text text-transparent">LIVE LEADERBOARD</h1>
            <p className="text-cyan-200/60 mt-2 text-lg">Leaderboard</p>
          </div>

          <div className="glass cyber-glow rounded-3xl p-6 md:p-10">
            <div className="space-y-4">
              {rankedLeaderboard.length === 0 ? (
                <div className="text-cyan-200/50 text-center py-10 text-xl font-bold">Waiting for scores...</div>
              ) : (
                rankedLeaderboard.map((item, index) => {
                  const rank = item.displayRank;
                  return (
                    <div key={item.id} className={`flex items-center justify-between p-4 md:p-6 rounded-2xl border ${rank <= 3 ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border-cyan-400/50 scale-105 my-6 shadow-lg shadow-cyan-500/20' : 'bg-cyan-500/5 border-cyan-500/20'} transition-all`}>
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 flex items-center justify-center rounded-full font-black text-xl ${rank === 1 ? 'bg-yellow-400/20 text-yellow-300 border border-yellow-400/50 shadow-[0_0_15px_rgba(250,204,21,0.5)]' : rank === 2 ? 'bg-slate-300/20 text-slate-200 border border-slate-300/50' : rank === 3 ? 'bg-orange-600/20 text-orange-400 border border-orange-600/50' : 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/30'}`}>
                          #{rank}
                        </div>
                        <div>
                          <div className={`font-black text-xl md:text-2xl ${rank <= 3 ? 'text-white' : 'text-cyan-100'}`}>{item.name}</div>
                          <div className="text-cyan-300/60 text-xs md:text-sm uppercase tracking-widest">{item.department}</div>
                        </div>
                      </div>
                      <div className={`font-black text-3xl md:text-4xl ${rank <= 3 ? 'text-cyan-300 drop-shadow-[0_0_10px_rgba(34,211,238,0.8)]' : 'text-blue-300'}`}>
                        {item.score}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          <div className="mt-8 text-center">
            <Link to="/" className="text-cyan-400 hover:text-cyan-300 underline font-semibold transition-colors">Return to Home</Link>
          </div>
        </div>
      </div>
    </>
  )
}
