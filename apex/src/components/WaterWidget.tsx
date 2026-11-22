import { motion } from 'framer-motion'
import { Droplets, Minus, Plus } from 'lucide-react'
import { useStore } from '../lib/store'
import { fmt, haptic, todayKey } from '../lib/utils'

export function WaterWidget() {
  const { totals, waterTarget, addWater } = useStore()
  const date = todayKey()
  const ml = totals(date).waterMl
  const goal = waterTarget(date)
  const pct = Math.min(1, ml / goal)

  const add = (delta: number) => {
    const before = ml
    addWater(delta)
    const after = Math.max(0, before + delta)
    if (before < goal && after >= goal) haptic([30, 50, 30, 50, 80])
    else haptic(delta > 0 ? 14 : 8)
  }

  return (
    <section className="card p-5">
      <div className="flex items-center gap-5">
        {/* glass */}
        <div className="relative h-[116px] w-[78px] shrink-0 overflow-hidden rounded-b-[26px] rounded-t-lg border-2 border-aqua/40 bg-aqua/[0.06]">
          <motion.div
            className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-aqua to-[#67e8f9]"
            initial={{ height: 0 }}
            animate={{ height: `${pct * 100}%` }}
            transition={{ type: 'spring', stiffness: 70, damping: 15 }}
          >
            <motion.div
              className="absolute -top-2 left-0 h-4 w-[200%] opacity-60"
              style={{
                backgroundImage:
                  'radial-gradient(circle at 50% 100%, #06B6D4 55%, transparent 56%)',
                backgroundSize: '26px 16px',
              }}
              animate={{ x: ['0%', '-13%'] }}
              transition={{ repeat: Infinity, duration: 2.2, ease: 'linear' }}
            />
          </motion.div>
          <div className="absolute inset-0 grid place-items-center">
            <Droplets size={22} className={pct > 0.5 ? 'text-white/90' : 'text-aqua'} />
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <p className="label">Hidratación</p>
          <div className="num mt-1 flex items-baseline gap-1.5">
            <span className="text-[34px] font-bold leading-none text-aqua">{fmt(ml)}</span>
            <span className="text-sm text-white/45">/ {fmt(goal)} ml</span>
          </div>
          <p className="mt-1 text-[12px] text-white/45">
            {ml >= goal ? '¡Objetivo cumplido! 💧' : `Faltan ${fmt(goal - ml)} ml`}
          </p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => add(-250)}
              aria-label="Quitar 250 mililitros"
              className="grid h-11 w-11 place-items-center rounded-xl bg-white/[0.06] text-white/70 active:scale-90"
            >
              <Minus size={18} />
            </button>
            <button
              onClick={() => add(250)}
              className="num flex h-11 flex-1 items-center justify-center gap-1 rounded-xl bg-aqua/15 text-[14px] font-bold text-aqua active:scale-95"
            >
              <Plus size={15} strokeWidth={3} />250
            </button>
            <button
              onClick={() => add(500)}
              className="num flex h-11 flex-1 items-center justify-center gap-1 rounded-xl bg-aqua text-[14px] font-bold text-[#021a1f] active:scale-95"
            >
              <Plus size={15} strokeWidth={3} />500
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
