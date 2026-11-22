import { motion } from 'framer-motion'
import { useStore } from '../lib/store'
import { STEP_GOAL } from '../features/ActivityPanel'
import { addDays, cn, haptic, keyToDate, todayKey } from '../lib/utils'

const LETTERS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

/** Monday-first week that contains `today`. */
export function weekOf(today: string): string[] {
  const d = keyToDate(today)
  const monday = (d.getDay() + 6) % 7
  return Array.from({ length: 7 }, (_, i) => addDays(today, i - monday))
}

/** 7-day strip: each day has a mini compliance ring (kcal · water · steps) and is tappable. */
export function WeekStrip({ selected, onSelect }: { selected: string; onSelect: (d: string) => void }) {
  const { targets, totals, waterTarget } = useStore()
  const today = todayKey()
  const days = weekOf(today)

  const score = (d: string): number => {
    if (!targets) return 0
    const t = totals(d)
    const kcal = t.consumed > 0 ? Math.min(1, t.consumed / targets.kcal) : 0
    const water = Math.min(1, t.waterMl / waterTarget(d))
    const steps = Math.min(1, t.steps / STEP_GOAL)
    return (kcal + water + steps) / 3
  }

  return (
    <div className="grid grid-cols-7 gap-1.5" role="tablist" aria-label="Semana">
      {days.map((d, i) => {
        const on = d === selected
        const future = d > today
        const v = future ? 0 : score(d)
        const R = 15
        const C = 2 * Math.PI * R
        return (
          <button
            key={d}
            role="tab"
            aria-selected={on}
            disabled={future}
            onClick={() => {
              haptic(8)
              onSelect(d)
            }}
            className={cn('relative flex flex-col items-center gap-1.5 rounded-2xl py-2.5 transition active:scale-95', future && 'opacity-35')}
          >
            {on && <motion.span layoutId="week-pill" className="absolute inset-0 rounded-2xl border border-white/[0.12] bg-white/[0.07]" style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12)' }} transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
            <span className={cn('relative text-[10px] font-bold tracking-[0.1em]', on ? 'text-white' : 'text-zinc-500')}>{LETTERS[i]}</span>
            <span className="relative grid h-[38px] w-[38px] place-items-center">
              <svg viewBox="0 0 38 38" className="absolute inset-0 -rotate-90">
                <circle cx="19" cy="19" r={R} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="3.5" />
                <circle
                  cx="19"
                  cy="19"
                  r={R}
                  fill="none"
                  stroke={v >= 0.95 ? '#10B981' : '#06B6D4'}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeDasharray={`${C * v} ${C}`}
                  style={{ transition: 'stroke-dasharray .6s cubic-bezier(.2,.8,.2,1)', filter: v > 0 ? 'drop-shadow(0 0 3px rgba(16,185,129,0.5))' : undefined }}
                />
              </svg>
              <span className={cn('num relative text-[12px]', on ? 'text-white' : d === today ? 'text-emerald' : 'text-zinc-300')}>{keyToDate(d).getDate()}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}
