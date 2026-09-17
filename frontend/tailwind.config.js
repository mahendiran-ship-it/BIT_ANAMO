/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        dark: {
          950: '#070A12', // Background
          900: '#0C1220', // Surface
          850: '#111A2E', // Surface raised
          800: '#18243E', // Card surface
          750: '#1F2E4D', // Active / border hover
          700: '#2A3C63', // Border standard
          600: '#475569',
        },
        btc: {
          primary: '#F7931A',
          hover: '#FF9F2A',
          muted: 'rgba(247, 147, 26, 0.15)',
        },
        intel: {
          cyan: '#00F0FF',
          blue: '#38BDF8',
          emerald: '#10B981',
          rose: '#F43F5E',
          purple: '#A855F7',
          amber: '#F59E0B',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Roboto Mono', 'monospace'],
      },
      boxShadow: {
        'glow-btc': '0 0 20px rgba(247, 147, 26, 0.25)',
        'glow-cyan': '0 0 20px rgba(0, 240, 255, 0.2)',
        'card': '0 4px 20px -2px rgba(0, 0, 0, 0.5)',
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'flash-row': 'flash 1.5s ease-out',
      },
      keyframes: {
        flash: {
          '0%': { backgroundColor: 'rgba(247, 147, 26, 0.25)' },
          '100%': { backgroundColor: 'transparent' },
        }
      }
    },
  },
  plugins: [],
}
