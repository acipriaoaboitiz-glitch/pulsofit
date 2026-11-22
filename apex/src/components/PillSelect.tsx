import { useId } from 'react'
import { motion } from 'framer-motion'
import { cn, haptic } from '../lib/utils'

export interface PillOption<T extends string> {
  id: T
  label: string
  desc?: string
}

/**
 * Touch-friendly replacement for a native <select>: a sliding highlight (layoutId) moves between pills.
 * `cards` stacks full-width options with a description; `chips` wraps compact pills.
 */
export function PillSelect<T extends string>({
  value,
  onChange,
  options,
  label,
  variant = 'chips',
  size = 'md',
}: {
  value: T
  onChange: (v: T) => void
  options: PillOption<T>[]
  label: string
  variant?: 'chips' | 'cards'
  size?: 'sm' | 'md'
}) {
  const uid = useId()
  const cards = variant === 'cards'
  return (
    <div role="radiogroup" aria-label={label} className={cn(cards ? 'grid gap-2' : 'flex flex-wrap gap-2')}>
      {options.map((o) => {
        const on = o.id === value
        return (
          <motion.button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={on}
            whileTap={{ scale: 0.96 }}
            onClick={() => {
              if (!on) {
                navigator.vibrate?.(15)
                haptic(6)
              }
              onChange(o.id)
            }}
            className={cn(
              'relative overflow-hidden border text-left transition-colors',
              cards ? 'rounded-2xl px-4 py-3' : size === 'sm' ? 'rounded-full px-3 py-1.5 text-[12px] font-bold' : 'rounded-full px-3.5 py-2 text-[13px] font-bold',
              on ? 'border-emerald/50 text-white' : 'border-white/[0.08] bg-white/[0.03] text-white/60 hover:border-white/20',
            )}
          >
            {on && <motion.span layoutId={`pill-${uid}`} className="absolute inset-0 bg-emerald/15" style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1)' }} transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
            <span className="relative block">
              <span className={cn('block', cards && 'text-[14px] font-bold')}>{o.label}</span>
              {cards && o.desc && <span className="mt-0.5 block text-[12px] font-medium text-white/45">{o.desc}</span>}
            </span>
          </motion.button>
        )
      })}
    </div>
  )
}
