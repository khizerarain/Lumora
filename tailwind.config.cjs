/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0a0a0a',
        panel: '#111111',
        line: '#1f1f1f',
        text: '#f4f4f4',
        muted: '#9ca3af',
      },
    },
  },
  plugins: [],
}
