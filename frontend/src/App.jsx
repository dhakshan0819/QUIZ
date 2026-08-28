import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

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

export default function App(){
  const navigate = useNavigate()

  useEffect(() => {
    // If a session already exists, automatically redirect to the quiz room
    try {
      const auth = JSON.parse(localStorage.getItem('studentAuth'))
      if (auth && auth.student) {
        navigate('/quiz')
      }
    } catch (e) {
      // invalid json, ignore
    }
  }, [navigate])

  return (
    <>
      <ParticleBackground />
      <div className="content-wrapper page-shell flex flex-col items-center justify-center p-4 md:p-6">
        {/* Animated background elements */}
        <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
          <div className="absolute top-10 left-10 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-20 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
          <div className="absolute top-1/2 left-1/3 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        </div>

        {/* Main content */}
        <div className="max-w-2xl w-full animate-fade-in-up">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="mb-6 inline-block">
              <div className="text-6xl md:text-7xl font-black bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-300 bg-clip-text text-transparent animate-slide-in">
                SIH QUIZ
              </div>
              <div className="text-2xl md:text-3xl font-bold text-cyan-300/80 mt-2 animate-slide-in" style={{ animationDelay: '0.2s' }}>
                ARENA
              </div>
            </div>
            <div className="h-1 w-24 bg-gradient-to-r from-cyan-500 to-blue-500 mx-auto mb-6 animate-slide-in" style={{ animationDelay: '0.4s' }}></div>
            <p className="text-cyan-200/70 text-lg md:text-xl leading-relaxed animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
              SIH Quiz Platform<br />
              Real-time competition • Live scoring • Professional certificates
            </p>
          </div>

          {/* Cards Grid */}
          <div className="grid md:grid-cols-2 gap-6 mb-8 animate-fade-in-up" style={{ animationDelay: '0.8s' }}>
            {/* Student Card */}
            <Link to="/register" className="group">
              <div className="glass cyber-glow p-8 rounded-xl cursor-pointer transition-all duration-300 hover:scale-105 h-full flex flex-col justify-between">
                <div>
                  <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-300">🎓</div>
                  <h3 className="text-2xl font-bold text-cyan-300 mb-3">Student</h3>
                  <p className="text-cyan-200/70 text-sm leading-relaxed">
                    Register and join the quiz competition. Answer questions and climb the leaderboard.
                  </p>
                </div>
                <div className="mt-6 inline-flex items-center text-cyan-400 font-semibold group-hover:translate-x-2 transition-transform">
                  Enter Arena →
                </div>
              </div>
            </Link>

            {/* Leaderboard Card */}
            <Link to="/leaderboard" className="group">
              <div className="glass cyber-glow p-8 rounded-xl cursor-pointer transition-all duration-300 hover:scale-105 h-full flex flex-col justify-between" style={{ animationDelay: '0.1s' }}>
                <div>
                  <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-300">🏆</div>
                  <h3 className="text-2xl font-bold text-yellow-300 mb-3">Leaderboard</h3>
                  <p className="text-cyan-200/70 text-sm leading-relaxed">
                    View the live rankings and track the top participants in real-time.
                  </p>
                </div>
                <div className="mt-6 inline-flex items-center text-yellow-400 font-semibold group-hover:translate-x-2 transition-transform">
                  View Standings →
                </div>
              </div>
            </Link>

            {/* Admin Card */}
            <Link to="/admin" className="group md:col-span-2">
              <div className="glass cyber-glow p-8 rounded-xl cursor-pointer transition-all duration-300 hover:scale-105 h-full flex flex-col justify-between" style={{ animationDelay: '0.2s' }}>
                <div>
                  <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-300">🛡️</div>
                  <h3 className="text-2xl font-bold text-blue-300 mb-3">Admin</h3>
                  <p className="text-cyan-200/70 text-sm leading-relaxed">
                    Manage the quiz, broadcast questions, reveal answers, and export results for all participants.
                  </p>
                </div>
                <div className="mt-6 inline-flex items-center text-blue-400 font-semibold group-hover:translate-x-2 transition-transform">
                  Go to Dashboard →
                </div>
              </div>
            </Link>
          </div>

          {/* Stats Bar */}
          <div className="glass p-6 rounded-xl text-center animate-fade-in-up" style={{ animationDelay: '1s' }}>
            <div className="grid grid-cols-3 gap-4 md:gap-8">
              <div>
                <div className="text-3xl font-bold text-cyan-400">40+</div>
                <div className="text-xs md:text-sm text-cyan-200/60 mt-1">Questions</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-blue-400">100+</div>
                <div className="text-xs md:text-sm text-cyan-200/60 mt-1">Users</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-purple-400">LAN</div>
                <div className="text-xs md:text-sm text-cyan-200/60 mt-1">Offline</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}