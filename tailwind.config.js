/** @type {import('tailwindcss').Config} */

// D11-ter : toutes les couleurs viennent des tokens OKLCH du design system
// (src/theme/terra-mortis-tokens.css). Le motif oklch(var(--x) / <alpha>)
// permet les opacités du système (bg-card/50, border/50, faction /0.2…).
const token = (nom) => `oklch(var(--${nom}) / <alpha-value>)`

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        background: token('background'),
        foreground: token('foreground'),
        card: { DEFAULT: token('card'), foreground: token('card-foreground') },
        popover: { DEFAULT: token('popover'), foreground: token('popover-foreground') },
        primary: { DEFAULT: token('primary'), foreground: token('primary-foreground') },
        secondary: { DEFAULT: token('secondary'), foreground: token('secondary-foreground') },
        muted: { DEFAULT: token('muted'), foreground: token('muted-foreground') },
        accent: { DEFAULT: token('accent'), foreground: token('accent-foreground') },
        destructive: {
          DEFAULT: token('destructive'),
          foreground: token('destructive-foreground'),
        },
        border: token('border'),
        input: token('input'),
        ring: token('ring'),
        chart: {
          1: token('chart-1'),
          2: token('chart-2'),
          3: token('chart-3'),
          4: token('chart-4'),
          5: token('chart-5'),
        },
        gold: { DEFAULT: token('gold'), dark: token('gold-dark') },
        sanctum: { DEFAULT: token('sanctum'), texte: token('sanctum-texte') },
        legion: { DEFAULT: token('legion'), texte: token('legion-texte') },
      },
      borderRadius: {
        sm: 'calc(var(--radius) - 4px)',
        md: 'calc(var(--radius) - 2px)',
        lg: 'var(--radius)',
        xl: 'calc(var(--radius) + 4px)',
      },
      fontFamily: {
        titre: ['Cinzel', 'serif'],
        wordmark: ['Cinzel', 'serif'],
        corps: ['"Crimson Text"', 'Georgia', 'serif'],
      },
      minHeight: {
        touch: '3.5rem',
      },
    },
  },
  plugins: [],
}
