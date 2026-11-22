import { useMemo } from 'react'

const COLORS = ['#8B5CF6', '#A78BFA', '#10B981', '#F97316', '#06B6D4', '#F4F4F5']

/** Destello de celebración (récord personal). Se monta con una `key` nueva para repetirlo. */
export function Confetti({ n = 28 }: { n?: number }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: n }, (_, i) => ({
        dx: Math.round((Math.random() - 0.5) * 340),
        dy: Math.round(-80 + Math.random() * 360),
        rot: Math.round((Math.random() - 0.5) * 900),
        color: COLORS[i % COLORS.length],
        delay: Math.round(Math.random() * 120),
      })),
    [n],
  )
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-[5] overflow-hidden">
      {pieces.map((p, i) => (
        <span
          key={i}
          className="confetti-piece"
          style={{ background: p.color, animationDelay: `${p.delay}ms`, ['--dx' as string]: `${p.dx}px`, ['--dy' as string]: `${p.dy}px`, ['--rot' as string]: `${p.rot}deg` }}
        />
      ))}
    </div>
  )
}
