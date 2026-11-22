/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        obsidian: '#080A0F',
        card: '#11151E',
        raised: '#171C28',
        line: 'rgba(255,255,255,0.07)',
        emerald: { DEFAULT: '#10B981', soft: 'rgba(16,185,129,0.14)' },
        fire: { DEFAULT: '#F59E0B', soft: 'rgba(245,158,11,0.14)' },
        aqua: { DEFAULT: '#38BDF8', soft: 'rgba(56,189,248,0.14)' },
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
