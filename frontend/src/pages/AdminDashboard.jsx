import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
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

export default function AdminDashboard(){
  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [showExports, setShowExports] = useState(false);
  const [certStudent, setCertStudent] = useState('');

  useEffect(()=>{
    fetch(`${getBackendUrl()}/api/questions`).then(r=>r.json()).then(j=>setQuestions(j.questions || []));
    socket.on('leaderboard:update', (p)=> setLeaderboard(p.leaderboard || []))
    socket.on('lobby:update', (p)=> console.log('lobby', p));
    socket.on('question:tick', (p)=> console.log('tick', p));
    return ()=>{ socket.off(); }
  },[]);

  const start = (q) => {
    setCurrent(q);
    socket.emit('admin:startQuestion', q);
  }

  const reveal = () => {
    if(current) socket.emit('admin:reveal', { questionId: current.id });
  }

  const downloadCSV = () => {
    window.location.href = `${getBackendUrl()}/api/exports/results/csv`;
  }

  const downloadXLSX = () => {
    window.location.href = `${getBackendUrl()}/api/exports/results/xlsx`;
  }

  const downloadCertificate = () => {
    if (certStudent.trim()) {
      window.location.href = `${getBackendUrl()}/api/exports/certificate/${certStudent}`;
    }
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  }

  return (
    <>
      <ParticleBackground />
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="content-wrapper page-shell p-4 md:p-8 relative"
      >
        {/* Background glow elements */}
        <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 left-10 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>

        {/* Header */}
        <motion.div className="mb-8 animate-fade-in-up">
          <h1 className="text-5xl md:text-6xl font-black bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent mb-2">
            ADMIN PANEL
          </h1>
          <p className="text-cyan-200/60">Control quiz flow • Monitor leaderboard • Export results</p>
        </motion.div>

        {/* Main grid */}
        <motion.div 
          className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Questions Panel */}
          <motion.div 
            className="lg:col-span-2 glass cyber-glow rounded-2xl p-6 backdrop-blur-xl"
            variants={itemVariants}
          > 
            <h2 className="text-2xl font-bold text-cyan-300 mb-4 flex items-center gap-2">
              📋 Questions Library
            </h2>
            <div className="max-h-[50vh] overflow-y-auto space-y-3">
              {questions.map((q, idx)=> (
                <motion.div 
                  key={q.id} 
                  className="glass p-4 rounded-lg cursor-pointer border border-cyan-500/20 hover:border-cyan-500/50 transition-all duration-300"
                  whileHover={{ x: 8, borderColor: 'rgba(0, 229, 255, 0.5)' }}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.02 }}
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <div className="font-semibold text-cyan-100 mb-1">{q.question.substring(0, 70)}...</div>
                      <div className="flex gap-2 text-xs">
                        <span className="px-2 py-1 bg-cyan-500/20 text-cyan-300 rounded">{q.category}</span>
                        <span className={`px-2 py-1 rounded text-white ${q.difficulty === 'Easy' ? 'bg-green-500/20' : q.difficulty === 'Medium' ? 'bg-yellow-500/20' : 'bg-red-500/20'}`}>
                          {q.difficulty}
                        </span>
                      </div>
                    </div>
                    <motion.button 
                      onClick={()=>start(q)} 
                      className="btn-cyber px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-bold rounded-lg whitespace-nowrap"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      START →
                    </motion.button>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Leaderboard & Controls */}
          <motion.div className="space-y-6" variants={itemVariants}>
            {/* Leaderboard */}
            <motion.div className="glass cyber-glow rounded-2xl p-6 backdrop-blur-xl">
              <h3 className="text-xl font-bold text-cyan-300 mb-4 flex items-center gap-2">
                🏆 Leaderboard
              </h3>
              <motion.div className="space-y-2">
                {leaderboard.slice(0, 10).map((s, idx)=> (
                  <motion.div 
                    key={s.id} 
                    className="flex items-center justify-between p-3 bg-cyan-500/10 rounded-lg border border-cyan-500/20"
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: idx * 0.05 }}
                    whileHover={{ x: 4, backgroundColor: 'rgba(0, 229, 255, 0.15)' }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-cyan-400 font-bold text-lg">#{idx + 1}</span>
                      <div>
                        <div className="text-cyan-100 font-semibold">{s.name.substring(0, 15)}</div>
                        <div className="text-cyan-300/60 text-xs">{s.registerNumber}</div>
                      </div>
                    </div>
                    <span className="text-blue-300 font-bold">{s.score}</span>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>

            {/* Control Buttons */}
            <motion.div className="glass cyber-glow rounded-2xl p-6 backdrop-blur-xl space-y-3">
              <motion.button 
                onClick={reveal} 
                className="btn-cyber w-full px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-white font-bold rounded-lg"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                ✓ REVEAL ANSWER
              </motion.button>

              <motion.button 
                onClick={()=>setShowExports(!showExports)}
                className="btn-cyber w-full px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white font-bold rounded-lg"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                {showExports ? '✕ HIDE EXPORTS' : '📊 SHOW EXPORTS'}
              </motion.button>

              {showExports && (
                <motion.div 
                  className="space-y-2 pt-3 border-t border-cyan-500/20"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <motion.button 
                    onClick={downloadCSV}
                    className="btn-cyber w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-semibold rounded-lg text-sm"
                    whileHover={{ scale: 1.02 }}
                  >
                    📥 CSV
                  </motion.button>
                  <motion.button 
                    onClick={downloadXLSX}
                    className="btn-cyber w-full px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-semibold rounded-lg text-sm"
                    whileHover={{ scale: 1.02 }}
                  >
                    📁 XLSX
                  </motion.button>
                  
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={certStudent}
                      onChange={(e) => setCertStudent(e.target.value)}
                      placeholder="Register No."
                      className="flex-1 px-3 py-2 bg-cyan-500/10 border border-cyan-500/30 rounded text-cyan-100 placeholder-cyan-400/40 focus:outline-none"
                    />
                    <motion.button 
                      onClick={downloadCertificate}
                      className="btn-cyber px-3 py-2 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-semibold rounded-lg text-sm"
                      whileHover={{ scale: 1.02 }}
                    >
                      🎖️
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Current Question Display */}
        {current && (
          <motion.div 
            className="glass cyber-glow rounded-2xl p-8 backdrop-blur-xl border-l-4 border-cyan-400"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="mb-4">
              <span className="text-cyan-300 font-semibold">Currently showing:</span>
            </div>
            <div className="text-2xl font-bold text-cyan-100 mb-4">{current.question}</div>
            <div className="grid grid-cols-2 gap-3">
              {[current.optionA, current.optionB, current.optionC, current.optionD].map((opt, i) => (
                <div 
                  key={i} 
                  className={`p-3 rounded-lg border ${String.fromCharCode(65 + i) === current.correct ? 'bg-green-500/20 border-green-500/50' : 'bg-cyan-500/10 border-cyan-500/20'}`}
                >
                  <span className="font-semibold">{String.fromCharCode(65 + i)}:</span> {opt}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </motion.div>
    </>
  )
}