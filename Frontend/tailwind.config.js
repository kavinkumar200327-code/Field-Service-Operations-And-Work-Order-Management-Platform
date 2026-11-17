/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f7ff',
          100: '#e0effe',
          200: '#bae0fd',
          300: '#7cc7fb',
          400: '#36abf6',
          500: '#0c8fe6',
          600: '#0170c4',
          700: '#02599f',
          800: '#064c83',
          900: '#0a3f6d',
          950: '#072847',
        },
        cyber: {
          dark: '#070b14',
          space: '#0b1120',
          card: '#0f172a',
          neonCyan: '#06b6d4',
          neonBlue: '#38bdf8',
          neonIndigo: '#6366f1',
          neonViolet: '#8b5cf6',
          neonEmerald: '#10b981',
          neonAmber: '#f59e0b',
        }
      },
      boxShadow: {
        'glow-sky': '0 0 25px -4px rgba(14, 165, 233, 0.45)',
        'glow-cyan': '0 0 25px -4px rgba(6, 182, 212, 0.5)',
        'glow-indigo': '0 0 25px -4px rgba(99, 102, 241, 0.45)',
        'glow-emerald': '0 0 25px -4px rgba(16, 185, 129, 0.45)',
        'glow-purple': '0 0 25px -4px rgba(168, 85, 247, 0.45)',
        'glow-amber': '0 0 25px -4px rgba(245, 158, 11, 0.45)',
        'glass': '0 10px 30px -5px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(255, 255, 255, 0.4) inset',
        'glass-dark': '0 10px 35px -5px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.08) inset',
      },
      animation: {
        'float': 'float 4s ease-in-out infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 2.5s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        }
      }
    },
  },
  plugins: [],
}
