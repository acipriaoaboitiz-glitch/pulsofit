import { useId } from 'react'
import { motion } from 'framer-motion'
import { Droplets, Minus, Plus } from 'lucide-react'
import { useStore } from '../lib/store'
import { SpringNumber } from './Ring'
import { fmt, haptic } from '../lib/utils'

/** Bento tile: animated liquid wave that rises with the ml drunk + one-tap buttons. */
export function HydrationCard({ date }: { date: string }) {
  const { totals, waterTarget, addWater } = useStore()
  const id = useId().replace(/:/g, '')
  const ml = totals(date).waterMl
  const goal = waterTarget(date)
  const pct = Math.min(1, ml / goal)

  const add = (delta: number) => {
    const before = ml
    addWater(delta, date)
    const after = Math.max(0, before + delta)
    if (before < goal && after >= goal) haptic([30, 50, 30, 50, 80])
    else haptic(delta > 0 ? 14 : 8)
  }

  return (
    <section className="card flex flex-col p-4">
      <div className="flex items-center justify-between">
        <span className="label flex items-center gap-1.5 !text-aqua">
          <Droplets size={12} /> Hidratación
        </span>
        <button
          onClick={() => add(-250)}
          aria-label="Quitar 250 mililitros"
          className="grid h-7 w-7 place-items-center rounded-lg bg-white/[0.06] text-white/55 transition active:scale-90"
        >
          <Minus size={14} />
        </button>
      </div>

      <div className="relative mt-3 h-[92px] overflow-hidden rounded-2xl border border-aqua/20 bg-aqua/[0.045]">
        <motion.div className="absolute inset-x-0 bottom-0" initial={{ height: 0 }} animate={{ height: `${pct * 100}%` }} transition={{ type: 'spring', stiffness: 70, damping: 15 }}>
          {pct > 0.005 && (
            <div className="absolute inset-x-0 -top-[9px] h-[10px] overflow-hidden">
              <motion.svg viewBox="0 0 200 20" preserveAspectRatio="none" className="h-full w-[200%]" animate={{ x: ['0%', '-50%'] }} transition={{ repeat: Infinity, duration: 3.4, ease: 'linear' }}>
                <defs>
                  <linearGradient id={`w-${id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#67e8f9" stopOpacity="0.95" />
                    <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.85" />
                  </linearGradient>
                </defs>
                <path d="M0 10 Q 25 0 50 10 T 100 10 T 150 10 T 200 10 V 20 H 0 Z" fill={`url(#w-${id})`} />
              </motion.svg>
            </div>
          )}
          <div className="h-full bg-gradient-to-b from-aqua/80 to-[#0891b2]/70" />
        </motion.div>
        <div className="absolute inset-0 grid place-items-center">
          <div className="text-center drop-shadow-[0_1px_6px_rgba(0,0,0,0.6)]">
            <SpringNumber value={ml} className="num text-[26px] font-bold leading-none" />
            <div className="num mt-0.5 text-[10px] text-white/70">/ {fmt(goal)} ml</div>
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <motion.button whileTap={{ scale: 0.92 }} onClick={() => add(250)} className="num flex h-11 items-center justify-center gap-1 rounded-xl bg-aqua/15 text-[13px] font-bold text-aqua active:bg-aqua/25">
          <Plus size={13} strokeWidth={3} />
          250
        </motion.button>
        <motion.button whileTap={{ scale: 0.92 }} onClick={() => add(500)} className="num flex h-11 items-center justify-center gap-1 rounded-xl bg-aqua text-[13px] font-bold text-[#021a1f] shadow-[0_8px_20px_-8px_rgba(6,182,212,0.8)]">
          <Plus size={13} strokeWidth={3} />
          500
        </motion.button>
      </div>
    </section>
  )
}
