/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        darker: '#090d16',      // Deep space obsidian background
        dark: '#0f172a',        // Slate-900 surface
        panel: '#131c2e',       // Elevated card & panel surface
        panelBorder: '#1e293b', // Subtle border separator
        gold: {
          300: '#fde68a',
          400: '#fbbf24',
          500: '#f59e0b',       // Primary industrial gold
          600: '#d97706',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}