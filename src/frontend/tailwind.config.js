/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Neural Symphony Cyberpunk Palette
        'cyber': {
          'black': '#0A0A0A',
          'dark': '#1A1A1A',
          'gray': '#2A2A2A',
          'blue': '#00D4FF',
          'green': '#39FF14',
          'pink': '#FF1493',
          'purple': '#9D4EDD',
          'orange': '#FF6B35',
          'white': '#FFFFFF',
        },
        'neural': {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#00D4FF',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        }
      },
      fontFamily: {
        'cyber': ['Orbitron', 'monospace'],
        'neural': ['Rajdhani', 'sans-serif'],
      },
      fontSize: {
        'cyber-xs': ['0.75rem', { lineHeight: '1rem', letterSpacing: '0.05em' }],
        'cyber-sm': ['0.875rem', { lineHeight: '1.25rem', letterSpacing: '0.05em' }],
        'cyber-base': ['1rem', { lineHeight: '1.5rem', letterSpacing: '0.05em' }],
        'cyber-lg': ['1.125rem', { lineHeight: '1.75rem', letterSpacing: '0.05em' }],
        'cyber-xl': ['1.25rem', { lineHeight: '1.75rem', letterSpacing: '0.05em' }],
        'cyber-2xl': ['1.5rem', { lineHeight: '2rem', letterSpacing: '0.05em' }],
        'cyber-3xl': ['1.875rem', { lineHeight: '2.25rem', letterSpacing: '0.05em' }],
        'cyber-4xl': ['2.25rem', { lineHeight: '2.5rem', letterSpacing: '0.05em' }],
      },
      animation: {
        'pulse-cyber': 'pulse-cyber 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite alternate',
        'neural-flow': 'neural-flow 3s ease-in-out infinite',
        'expert-pulse': 'expert-pulse 1.5s ease-in-out infinite',
        'reasoning-wave': 'reasoning-wave 4s ease-in-out infinite',
        'data-stream': 'data-stream 1s linear infinite',
      },
      keyframes: {
        'pulse-cyber': {
          '0%, 100%': { 
            opacity: '1',
            boxShadow: '0 0 5px currentColor'
          },
          '50%': { 
            opacity: '.7',
            boxShadow: '0 0 20px currentColor, 0 0 30px currentColor'
          },
        },
        'glow-pulse': {
          '0%': {
            textShadow: '0 0 5px currentColor',
          },
          '100%': {
            textShadow: '0 0 20px currentColor, 0 0 30px currentColor',
          },
        },
        'neural-flow': {
          '0%': {
            backgroundPosition: '0% 50%'
          },
          '50%': {
            backgroundPosition: '100% 50%'
          },
          '100%': {
            backgroundPosition: '0% 50%'
          }
        },
        'expert-pulse': {
          '0%, 100%': {
            transform: 'scale(1)',
            opacity: '0.8'
          },
          '50%': {
            transform: 'scale(1.1)',
            opacity: '1'
          }
        },
        'reasoning-wave': {
          '0%, 100%': {
            transform: 'translateY(0px) scale(1)',
          },
          '33%': {
            transform: 'translateY(-10px) scale(1.02)',
          },
          '66%': {
            transform: 'translateY(5px) scale(0.98)',
          }
        },
        'data-stream': {
          '0%': {
            transform: 'translateX(-100%)',
          },
          '100%': {
            transform: 'translateX(100%)',
          }
        }
      },
      backgroundImage: {
        'neural-gradient': 'linear-gradient(45deg, #00D4FF, #39FF14, #FF1493)',
        'cyber-gradient': 'linear-gradient(135deg, #00D4FF22, #39FF1422, #FF149322)',
        'expert-math': 'linear-gradient(135deg, #00D4FF, #0284c7)',
        'expert-creative': 'linear-gradient(135deg, #39FF14, #22c55e)',
        'expert-logic': 'linear-gradient(135deg, #FF1493, #ec4899)',
        'expert-analysis': 'linear-gradient(135deg, #9D4EDD, #a855f7)',
      },
      backdropBlur: {
        'cyber': '20px',
      },
      boxShadow: {
        'cyber': '0 0 20px rgba(0, 212, 255, 0.3)',
        'cyber-intense': '0 0 30px rgba(0, 212, 255, 0.5), 0 0 60px rgba(0, 212, 255, 0.3)',
        'neural': '0 8px 32px rgba(0, 0, 0, 0.3)',
        'expert': '0 4px 20px rgba(0, 212, 255, 0.2)',
      },
      borderRadius: {
        'cyber': '0.375rem',
        'neural': '1rem',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '92': '23rem',
        '96': '24rem',
        '128': '32rem',
      }
    },
  },
  plugins: [
    function({ addUtilities }) {
      const newUtilities = {
        '.cyber-border': {
          border: '1px solid rgba(0, 212, 255, 0.3)',
          borderRadius: '0.375rem',
        },
        '.cyber-border-active': {
          border: '1px solid #00D4FF',
          boxShadow: '0 0 10px rgba(0, 212, 255, 0.3)',
        },
        '.neural-glass': {
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        },
        '.expert-glow': {
          filter: 'drop-shadow(0 0 8px currentColor)',
        },
        '.text-cyber-gradient': {
          background: 'linear-gradient(45deg, #00D4FF, #39FF14, #FF1493)',
          '-webkit-background-clip': 'text',
          '-webkit-text-fill-color': 'transparent',
        }
      }
      addUtilities(newUtilities)
    }
  ],
}