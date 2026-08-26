module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cyberblack: '#0a0e27',
        neon: '#00e5ff',
        cyber: {
          dark: '#0f1729',
          darker: '#071021',
          accent: '#00e5ff',
        },
      },
      animation: {
        'slide-in': 'slideIn 0.6s ease-out',
        'fade-in-up': 'fadeInUp 0.8s ease-out',
        float: 'float 6s ease-in-out infinite',
        glow: 'glow 2s ease-in-out infinite',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        shimmer: 'shimmer 2s linear infinite',
        'cyber-border': 'cyberBorder 3s ease-in-out infinite',
      },
      keyframes: {
        slideIn: {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        fadeInUp: {
          from: { opacity: '0', transform: 'translateY(30px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
          '50%': { transform: 'translateY(-20px) rotate(2deg)' },
        },
        glow: {
          '0%, 100%': { filter: 'drop-shadow(0 0 20px rgba(0, 229, 255, 0.3))' },
          '50%': { filter: 'drop-shadow(0 0 40px rgba(0, 229, 255, 0.6))' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '0.55' },
          '50%': { opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
        cyberBorder: {
          '0%, 100%': { boxShadow: '0 0 10px rgba(0, 229, 255, 0.3), inset 0 0 10px rgba(0, 229, 255, 0.1)' },
          '50%': { boxShadow: '0 0 20px rgba(0, 229, 255, 0.6), inset 0 0 20px rgba(0, 229, 255, 0.2)' },
        },
      },
    },
  },
  plugins: [],
}