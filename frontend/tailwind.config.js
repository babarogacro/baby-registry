/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        cream:     '#FAF7F2',
        blush:     '#F2D9D0',
        'blush-mid':'#E8B8A8',
        rose:      '#C97B6B',
        sage:      '#8BA888',
        'sage-light':'#D4E4D2',
        'warm-gray':'#6B6360',
        charcoal:  '#2C2320',
        gold:      '#C9A96E',
      },
      fontFamily: {
        serif: ['var(--font-serif)', '"DM Serif Display"', 'Georgia', 'serif'],
        sans:  ['var(--font-sans)', '"DM Sans"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
    },
  },
  plugins: [],
}
