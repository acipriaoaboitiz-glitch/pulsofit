import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { cn, fmt } from '../lib/utils'

export function PageHeader({ title, sub, right }: { title: string; sub?: string; right?: ReactNode }) {
  return (
    <header className="flex items-end justify-between px-5 pb-4 pt-[calc(18px+var(--safe-top))]">
      <div>
        {sub && <p className="label mb-1">{sub}</p>}
        <h1 className="text-[28px] font-extrabold leading-none tracking-tight">{title}</h1>
      </div>
      {right}
    </header>
  )
}

export function MacroBar({
  label,
  value,
  target,
  color,
}: {
  label: string
  value: number
  target: number
  color: string
}) {
  const pct = target > 0 ? Math.min(1, value / target) : 0
  const over = value > target
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-[12px] font-bold text-white/70">{label}</span>
        <span className="num text-[12px] text-white/50">
          <b className={cn('text-[13px]', over ? 'text-fire' : 'text-white')}>{fmt(value)}</b> / {fmt(target)} g
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/[0.07]">
        <motion.div
          className="h-full rounded-full"
          style={{ background: color, boxShadow: `0 0 12px ${color}99` }}
          initial={{ width: 0 }}
          animate={{ width: `${pct * 100}%` }}
          transition={{ type: 'spring', stiffness: 80, damping: 18 }}
        />
      </div>
    </div>
  )
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (v: T) => void
  options: { id: T; label: string }[]
}) {
  return (
    <div className="flex rounded-2xl border border-line bg-raised p-1">
      {options.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          className={cn(
            'flex-1 rounded-xl py-2.5 text-[14px] font-bold transition',
            value === o.id ? 'bg-emerald text-[#04130d]' : 'text-white/55',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Stepper({
  value,
  onChange,
  step = 1,
  min = 0,
  max = 999,
  unit,
}: {
  value: number
  onChange: (n: number) => void
  step?: number
  min?: number
  max?: number
  unit?: string
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        className="grid h-11 w-11 place-items-center rounded-xl bg-white/[0.06] text-xl font-bold active:scale-90"
        onClick={() => onChange(Math.max(min, value - step))}
        aria-label="Menos"
      >
        −
      </button>
      <div className="num min-w-[64px] text-center text-xl font-bold">
        {value}
        {unit && <span className="ml-1 text-sm text-white/40">{unit}</span>}
      </div>
      <button
        className="grid h-11 w-11 place-items-center rounded-xl bg-white/[0.06] text-xl font-bold active:scale-90"
        onClick={() => onChange(Math.min(max, value + step))}
        aria-label="Más"
      >
        +
      </button>
    </div>
  )
}

export function Empty({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center text-white/40">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white/[0.04]">{icon}</div>
      <p className="max-w-[240px] text-sm">{text}</p>
    </div>
  )
}
