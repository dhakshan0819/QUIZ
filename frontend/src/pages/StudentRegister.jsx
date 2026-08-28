import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { getBackendUrl } from '../utils/config'

const ParticleBackground = () => {
  const [particles, setParticles] = useState([])
  
  useEffect(() => {
    const newParticles = Array.from({ length: 12 }).map((_, i) => ({
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

export default function StudentRegister(){
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();
  const navigate = useNavigate();
  const [status, setStatus] = useState(null);

  const onSubmit = async (data) => {
    try {
      setStatus({ type: 'loading', message: 'Registering...' });
      const res = await fetch(`${getBackendUrl()}/api/students/register`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(data)
      });
      const j = await res.json();
      if (res.ok) {
        localStorage.setItem('studentAuth', JSON.stringify({ token: j.token || null, student: j.student }))
        setStatus({ type: 'success', message: 'Welcome to the Arena!' });
        setTimeout(() => navigate('/quiz'), 900);
      } else {
        setStatus({ type: 'error', message: j.error || 'Registration failed' });
      }
    } catch (e) {
      setStatus({ type: 'error', message: 'Network error. Check your connection.' });
    }
  };

  return (
    <>
      <ParticleBackground />
      <div className="content-wrapper page-shell flex items-center justify-center p-4">
        {/* Background glow elements */}
        <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 right-20 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-40 left-20 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>

        {/* Form container */}
        <div className="w-full max-w-md animate-fade-in-up">
          <form onSubmit={handleSubmit(onSubmit)} className="glass cyber-glow p-8 rounded-2xl backdrop-blur-xl">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent mb-2">
                ENTER ARENA
              </h1>
              <p className="text-cyan-200/60 text-sm">Join the cyber security competition</p>
            </div>

            {/* Status Messages */}
            {status && (
              <div
                className={`mb-6 p-4 rounded-lg text-center text-sm font-medium transition-all duration-300 ${
                  status.type === 'success'
                    ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                    : status.type === 'error'
                    ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                    : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                }`}
              >
                {status.message}
              </div>
            )}

            {/* Name Input */}
            <div className="mb-6">
              <label className="block text-cyan-300 text-sm font-semibold mb-2">Full Name</label>
              <input
                {...register('name', { required: 'Name is required' })}
                placeholder="Enter your full name"
                className="w-full px-4 py-3 bg-cyan-500/5 border border-cyan-500/30 rounded-lg text-cyan-100 placeholder-cyan-400/40 focus:outline-none transition-all duration-300 hover:border-cyan-500/50"
              />
              {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>}
            </div>

            {/* Register Number Input */}
            <div className="mb-8">
              <label className="block text-cyan-300 text-sm font-semibold mb-2">Register Number</label>
              <input
                {...register('registerNumber', { required: 'Register number is required' })}
                placeholder="Enter your register number"
                className="w-full px-4 py-3 bg-cyan-500/5 border border-cyan-500/30 rounded-lg text-cyan-100 placeholder-cyan-400/40 focus:outline-none transition-all duration-300 hover:border-cyan-500/50"
              />
              {errors.registerNumber && <p className="text-red-400 text-xs mt-1">{errors.registerNumber.message}</p>}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || status?.type === 'loading'}
              className="btn-cyber w-full px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-bold rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-lg"
            >
              {isSubmitting || status?.type === 'loading' ? 'REGISTERING...' : 'REGISTER NOW'}
            </button>

            {/* Footer */}
            <p className="text-center text-cyan-200/50 text-xs mt-6">
              Once registered, wait for the admin to start the quiz
            </p>
          </form>

          {/* Info card */}
          <div className="glass p-4 rounded-lg mt-6 text-center">
            <p className="text-cyan-200/60 text-sm">
              <span className="text-cyan-400 font-semibold">Multiple Rounds & Live Challenges</span> in SIH Arena
            </p>
          </div>
        </div>
      </div>
    </>
  )
}