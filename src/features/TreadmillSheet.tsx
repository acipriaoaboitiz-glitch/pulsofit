import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Check, Flame, Minus, Plus, SlidersHorizontal, TrendingUp, Undo2 } from 'lucide-react'
import { Sheet } from '../components/Sheet'
import { useStore } from '../lib/store'
import { useUI } from '../lib/ui'
import { TREADMILL_FALLBACK_KG, TREADMILL_MINUTES, TREADMILL_PRESETS, treadmillKcal } from '../lib/calc'
import { cn, fmt, haptic, todayKey } from '../lib/utils'

const buzz = (): void => {
  navigator.vibrate?.(15)
  haptic(6)
}

/** Last treadmill settings (synced with the cloud through the cardio log) or the usual 15 % · 4.5 km/h · 30 min. */
export function useTreadmillMemory() {
  const { state } = useStore()
  const last = [...state.cardio].filter((c) => c.cardio === 'treadmill').sort((a, b) => b.u - a.u)[0]
  return {
    speed: last?.speedKmh ?? 4.5,
    incline: last?.inclinePct ?? 15,
    minutes: last?.minutes ?? 30,
    weightKg: state.profile?.weightKg ?? TREADMILL_FALLBACK_KG,
    hasLast: !!last,
  }
}

/** One tap: logs the remembered session (or 15 % · 4.5 km/h · 30 min) with an inline «Deshacer». */
export function TreadmillQuick({ date, className, label = '+ Cinta 15% (1 toque)' }: { date?: string; className?: string; label?: string }) {
  const { state, addCardio, removeCardio } = useStore()
  const ui = useUI()
  const mem = useTreadmillMemory()
  const day = date ?? todayKey()
  const [done, setDone] = useState<{ kcal: number; minutes: number } | null>(null)
  const timer = useRef<number | undefined>(undefined)
  const kcal = treadmillKcal(mem.speed, mem.incline, mem.weightKg, mem.minutes)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const log = () => {
    buzz()
    addCardio({ date: day, cardio: 'treadmill', minutes: mem.minutes, kcal, inclinePct: mem.incline, speedKmh: mem.speed })
    setDone({ kcal, minutes: mem.minutes })
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setDone(null), 6000)
  }
  const undo = () => {
    buzz()
    const mine = state.cardio.filter((c) => c.cardio === 'treadmill' && c.date === day).sort((a, b) => b.u - a.u)[0]
    if (mine) removeCardio(mine.id)
    setDone(null)
  }

  if (done) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className={cn('flex min-h-[44px] flex-wrap items-center gap-x-2 rounded-2xl border border-emerald/30 bg-emerald/10 px-3 py-1', className)}>
        <Check size={16} className="shrink-0 text-emerald" strokeWidth={3} />
        <span className="num min-w-[130px] flex-1 text-[12.5px] font-bold text-emerald">
          Cinta {done.minutes} min · {fmt(done.kcal)} kcal
        </span>
        <button onClick={undo} className="flex min-h-[36px] items-center gap-1 rounded-lg px-2 text-[12px] font-bold text-white/70 active:scale-95">
          <Undo2 size={13} /> Deshacer
        </button>
      </motion.div>
    )
  }

  return (
    <div className={cn('flex gap-2', className)}>
      <motion.button whileTap={{ scale: 0.96 }} onClick={log} className="btn min-h-[44px] flex-1 border border-fire/30 bg-fire/15 !px-3 !py-2.5 text-[13px] text-fire" aria-label={`Registrar cinta inclinada ${mem.minutes} minutos`}>
        <TrendingUp size={15} strokeWidth={2.6} /> {label}
      </motion.button>
      <motion.button
        whileTap={{ scale: 0.94 }}
        onClick={() => {
          buzz()
          ui.open('treadmill', { date: day })
        }}
        className="btn-ghost grid min-h-[44px] w-11 shrink-0 place-items-center !px-0 !py-0"
        aria-label="Ajustar cinta: inclinación, velocidad y minutos"
      >
        <SlidersHorizontal size={16} />
      </motion.button>
    </div>
  )
}

/** «Sesión de Cardio Post-Entreno»: highlighted card at the end of every gym day. */
export function TreadmillCard({ className }: { className?: string }) {
  const mem = useTreadmillMemory()
  const kcal = treadmillKcal(mem.speed, mem.incline, mem.weightKg, mem.minutes)
  return (
    <div className={cn('relative overflow-hidden rounded-[22px] border border-fire/25 p-4', className)} style={{ background: 'linear-gradient(145deg, rgba(249,115,22,0.16), rgba(249,115,22,0.04) 70%, rgba(11,15,23,0.6))', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1)' }}>
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-fire/20 text-fire">
          <TrendingUp size={22} strokeWidth={2.4} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-extrabold leading-tight">Sesión de Cardio Post-Entreno</p>
          <p className="num mt-1 text-[12px] text-white/55">
            Cinta {mem.incline}% · {mem.speed.toFixed(1)} km/h · {mem.minutes} min
          </p>
        </div>
        <span className="num flex shrink-0 items-center gap-0.5 text-[15px] font-bold text-fire">
          <Flame size={13} />~{fmt(kcal)}
        </span>
      </div>
      <TreadmillQuick className="mt-3.5" />
    </div>
  )
}

function Adjuster({ label, value, unit, min, max, step, slide, onChange }: { label: string; value: number; unit: string; min: number; max: number; step: number; slide: number; onChange: (v: number) => void }) {
  const set = (v: number) => onChange(Math.round(Math.min(max, Math.max(min, v)) * 10) / 10)
  const btn = 'grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/[0.07] active:scale-90'
  return (
    <div className="card-raised p-3.5">
      <div className="mb-2 flex items-baseline justify-between">
        <span className="label">{label}</span>
        <span className="num text-[20px] font-bold">
          {Number.isInteger(value) ? value : value.toFixed(1)}
          <span className="ml-1 text-[11px] text-white/40">{unit}</span>
        </span>
      </div>
      <div className="flex items-center gap-3">
        <button className={btn} aria-label={`Menos ${label}`} onClick={() => { buzz(); set(value - step) }}>
          <Minus size={18} />
        </button>
        <input type="range" min={min} max={max} step={slide} value={value} onChange={(e) => set(parseFloat(e.target.value))} aria-label={label} className="h-8 min-w-0 flex-1 accent-emerald" />
        <button className={btn} aria-label={`Más ${label}`} onClick={() => { buzz(); set(value + step) }}>
          <Plus size={18} />
        </button>
      </div>
    </div>
  )
}

function Body() {
  const ui = useUI()
  const { addCardio } = useStore()
  const mem = useTreadmillMemory()
  const [speed, setSpeed] = useState(mem.speed)
  const [incline, setIncline] = useState(mem.incline)
  const [minutes, setMinutes] = useState(mem.minutes)
  const kcal = treadmillKcal(speed, incline, mem.weightKg, minutes)
  const perMin = minutes > 0 ? kcal / minutes : 0

  const register = () => {
    haptic([20, 40, 20])
    navigator.vibrate?.(15)
    addCardio({ date: ui.sheet?.date ?? todayKey(), cardio: 'treadmill', minutes, kcal, inclinePct: incline, speedKmh: speed })
    ui.close()
  }

  return (
    <div className="space-y-4 pb-2">
      <div className="space-y-3">
        {TREADMILL_PRESETS.map((p) => {
          const on = speed === p.speed && incline === p.incline
          return (
            <div key={p.id} className={cn('rounded-2xl border p-3.5 transition-colors', on ? 'border-fire/50 bg-fire/10' : 'border-white/[0.08] bg-white/[0.03]')}>
              <button
                className="flex min-h-[44px] w-full items-center justify-between text-left"
                onClick={() => {
                  buzz()
                  setSpeed(p.speed)
                  setIncline(p.incline)
                }}
              >
                <span>
                  <span className="block text-[15px] font-extrabold">{p.name}</span>
                  <span className="num block text-[12px] text-white/50">
                    {p.incline}% | {p.speed.toFixed(1)} km/h
                  </span>
                </span>
                {on && <Check size={18} className="text-fire" strokeWidth={3} />}
              </button>
              <div className="mt-2 grid grid-cols-4 gap-2">
                {TREADMILL_MINUTES.map((m) => (
                  <motion.button
                    key={m}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => {
                      buzz()
                      setSpeed(p.speed)
                      setIncline(p.incline)
                      setMinutes(m)
                    }}
                    className={cn('num min-h-[44px] rounded-xl border text-[14px] font-bold transition-colors', on && minutes === m ? 'border-fire bg-fire text-[#1c0b00]' : 'border-white/[0.08] bg-white/[0.05] text-white/70')}
                  >
                    {m}
                    <span className="ml-0.5 text-[10px] font-semibold opacity-70">min</span>
                  </motion.button>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <div className="space-y-2.5">
        <p className="label px-1">Ajustar (opcional)</p>
        <Adjuster label="Inclinación" value={incline} unit="%" min={0} max={15} step={1} slide={1} onChange={setIncline} />
        <Adjuster label="Velocidad" value={speed} unit="km/h" min={3} max={8} step={0.5} slide={0.1} onChange={setSpeed} />
        <Adjuster label="Tiempo" value={minutes} unit="min" min={10} max={90} step={5} slide={5} onChange={setMinutes} />
      </div>

      <div className="card relative overflow-hidden p-4 text-center">
        <div className="pointer-events-none absolute -top-16 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-fire/20 blur-3xl" />
        <p className="label relative">Calorías quemadas</p>
        <div className="num relative mt-1 flex items-center justify-center gap-1.5 text-[44px] font-bold leading-none text-fire">
          <Flame size={28} />
          {fmt(kcal)}
          <span className="text-[14px] font-semibold text-white/40">kcal</span>
        </div>
        <p className="num relative mt-2 text-[11px] leading-snug text-white/40">
          ACSM · {fmt(mem.weightKg)} kg · {perMin.toFixed(1)} kcal/min
        </p>
      </div>

      <motion.button whileTap={{ scale: 0.96 }} className="btn-primary w-full !py-4 text-[16px]" onClick={register}>
        Registrar cardio · {fmt(kcal)} kcal
      </motion.button>
    </div>
  )
}

export function TreadmillSheet() {
  const { sheet, close } = useUI()
  const open = sheet?.name === 'treadmill'
  return (
    <Sheet open={open} onClose={close} title="Cardio · Cinta inclinada" full>
      {open && <Body />}
    </Sheet>
  )
}
