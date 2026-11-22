/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        obsidian: '#05070B',
        card: '#0B0F17',
        raised: '#111724',
        line: 'rgba(255,255,255,0.08)',
        emerald: { DEFAULT: '#10B981', soft: 'rgba(16,185,129,0.14)' },
        fire: { DEFAULT: '#F97316', soft: 'rgba(249,115,22,0.14)' },
        aqua: { DEFAULT: '#06B6D4', soft: 'rgba(6,182,212,0.14)' },
        neon: { DEFAULT: '#8B5CF6', soft: 'rgba(139,92,246,0.16)' },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
}
