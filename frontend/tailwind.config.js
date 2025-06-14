/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        'banking-black': '#0A0A0B',
        'banking-purple': '#6B46C1',
        'banking-mint': '#10B981',
        'banking-gray': '#27272A',
        'rh-green': '#00C805',
        'banking-blue': '#0066FF',
        'banking-green': '#00C853',
        'banking-red': '#FF3B30',
        'banking-bg': '#F5F5F7',
      },
      borderRadius: {
        xl: '1rem', // 16px rounded corners for cards/buttons
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-blue': 'pulseBlue 2s ease-in-out infinite',
        'count-up': 'countUp 1s ease-out forwards',
      },
      keyframes: {
        slideUp: {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        pulseBlue: {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '1' },
        },
        countUp: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}; 