/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        cafe: {
          bg:      '#0a0a12',
          surface: '#12121e',
          border:  '#1e1e30',
          accent:  '#7c3aed',
          accent2: '#a78bfa',
          text:    '#e2e8f0',
          muted:   '#64748b',
        }
      }
    }
  },
  plugins: [],
}
