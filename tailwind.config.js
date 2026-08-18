/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        terre: {
          950: '#0f0d0c',
          900: '#1a1512',
          800: '#2a201a',
        },
        sang: {
          700: '#7f1d1d',
          800: '#5c1414',
        },
        ambre: {
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
        },
        // Tokens de la maquette validée (t004, D11-bis)
        fond: '#0a0e17',
        panneau: '#0e1421',
        ligne: '#223046',
        or: '#f2b135',
        cta: '#e8720f',
        sanctum: '#4d9cf6',
        legion: '#e23b3b',
        ok: '#37a35a',
      },
      fontFamily: {
        titre: ['"Cormorant Garamond"', 'serif'],
        wordmark: ['Cinzel', 'serif'],
        corps: ['"Crimson Text"', 'serif'],
      },
      fontSize: {
        base: ['1.125rem', '1.6'],
      },
      minHeight: {
        touch: '3.5rem',
      },
    },
  },
  plugins: [],
}
