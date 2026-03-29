/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        cafe: {
          bg:      '#0a0d00',
          surface: '#111800',
          border:  '#1e2d00',
          accent:  '#89CC04',
          accent2: '#b0e833',
          text:    '#e8f0d0',
          muted:   '#6b7c3a',
        }
      }
    }
  },
  plugins: [],
}
