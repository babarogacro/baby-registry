const token = name => `rgb(var(--${name}) / <alpha-value>)`

const TOKENS = [
  'canvas', 'surface', 'sunken', 'ink', 'muted', 'line', 'coal',
  'tomato', 'tomato-soft', 'tomato-ink',
  'cobalt', 'cobalt-soft', 'cobalt-ink',
  'sun', 'sun-soft', 'sun-ink',
  'mint', 'mint-soft', 'mint-ink',
  'bubble', 'bubble-soft', 'bubble-ink',
  'sky', 'sky-soft', 'sky-ink',
  'hero', 'hero-ink',
  // Set by the .tone-* classes, so one component can take any colour.
  'tone', 'tone-soft', 'tone-ink', 'on-tone', 'tile',
]

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: Object.fromEntries(TOKENS.map(name => [name, token(name)])),
      fontFamily: {
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        note: ['var(--font-note)', 'cursive'],
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.75rem',
      },
      boxShadow: {
        float: 'var(--shadow-float)',
        lift: 'var(--shadow-lift)',
      },
      zIndex: {
        nav: '40',
        modal: '60',
        toast: '70',
      },
    },
  },
  plugins: [],
}
