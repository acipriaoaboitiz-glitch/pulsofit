import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Dumbbell, Flame, Footprints, Plus, Play } from 'lucide-react'
import { useStore } from '../lib/store'
import { useUI } from '../lib/ui'
import { cn, fmt, fmtClock, greeting, haptic, keyToDate, todayKey } from '../lib/utils'
import { buildActive, muscleLoad } from '../lib/workout'
import { MUSCLES, WEEK_PLAN } from '../lib/exercises'
import { Ring, SpringNumber } from '../components/Ring'
import { MacroBar } from '../components/bits'
import { HydrationCard } from '../components/HydrationCard'
import { WeightCard } from '../components/WeightCard'
import { WeekStrip } from '../components/WeekStrip'
import { MagicBar } from '../features/MagicBar'
import { QuickActions } from '../components/QuickActions'
import { STEP_GOAL } from '../features/ActivityPanel'
import { TreadmillQuick } from '../features/TreadmillSheet'
import { useDesktop } from '../lib/useMedia'

const H48 = 48 * 3600 * 1000

/** Streak badge with a living flame. */
function StreakBadge({ days }: { days: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-fire/30 bg-fire/10 px-2.5 py-1 text-[12px] font-bold text-fire">
      <motion.span animate={{ scale: [1, 1.18, 0.96, 1.1, 1], rotate: [0, -6, 4, -3, 0] }} transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }} className="grid place-items-center" style={{ filter: 'drop-shadow(0 0 5px rgba(249,115,22,0.7))' }}>
        <Flame size={15} fill="currentColor" />
      </motion.span>
      <span className="num">{days}</span> {days === 1 ? 'día' : 'días'}
    </span>
  )
}

function StepsCard({ date }: { date: string }) {
  const { totals } = useStore()
  const ui = useUI()
  const desk = useDesktop()
  const t = totals(date)
  return (
    <section className="card flex flex-col p-4 lg:p-6">
      <span className="label flex items-center gap-1.5 !text-fire">
        <Footprints size={12} /> Pasos y actividad
      </span>
      <div className="mt-3 flex flex-1 items-center gap-3 lg:gap-5">
        <Ring size={desk ? 116 : 78} stroke={desk ? 12 : 9} value={t.steps / STEP_GOAL} gradient={['#F97316', '#FBBF24']}>
          <span className="num text-[13px] font-bold leading-none lg:text-[19px]">{fmt(t.steps)}</span>
        </Ring>
        <div className="min-w-0">
          <div className="num text-[17px] font-bold leading-none lg:text-[24px]">
            {t.km.toFixed(1)}
            <span className="ml-0.5 text-[10px] text-white/40">km</span>
          </div>
          <div className="num mt-1.5 flex items-center gap-0.5 text-[13px] font-bold leading-none text-fire">
            <Flame size={11} />
            {fmt(t.stepsKcal + t.cardioKcal)}
            <span className="ml-0.5 text-[10px] font-semibold text-white/40">kcal</span>
          </div>
        </div>
      </div>
      <p className="num mt-2 text-[10px] text-white/35 lg:mb-3 lg:text-[11px]">objetivo {fmt(STEP_GOAL)} pasos · 24/7</p>
      <TreadmillQuick date={date} className="mt-auto" />
      <button className="btn-ghost mt-2 w-full !py-2.5 text-[13px]" onClick={() => ui.open('activity')}>
        <Plus size={14} strokeWidth={3} /> Registrar
      </button>
    </section>
  )
}

function WorkoutCard({ date }: { date: string }) {
  const { state, setActive } = useStore()
  const today = date === todayKey()
  const sessions = state.sessions.filter((s) => s.date === date)
  const [now] = useState(() => Date.now())
  const load = useMemo(() => muscleLoad(state.sessions, state.active), [state.sessions, state.active])
  const fresh = MUSCLES.filter((m) => !load[m] || now - load[m].lastAt >= H48)
  const dow = keyToDate(date).getDay()
  const planDay = dow >= 1 && dow <= 5 ? WEEK_PLAN.find((d) => d.day === dow) : undefined
  const routine = planDay ? state.routines.find((r) => r.id === `week-${planDay.day}`) : undefined

  const treadmills = state.cardio.filter((c) => c.date === date && c.cardio === 'treadmill')
  const treadMin = treadmills.reduce((a, c) => a + c.minutes, 0)
  const treadKcal = treadmills.reduce((a, c) => a + c.kcal, 0)
  const vol = sessions.reduce((a, s) => a + s.volume, 0)
  const kcal = sessions.reduce((a, s) => a + s.kcal, 0)

  return (
    <section className="card flex flex-col p-4 lg:p-6">
      <span className="label flex items-center gap-1.5 !text-neon">
        <Dumbbell size={12} /> Entreno del día
      </span>

      {treadmills.length > 0 && (
        <div className="mt-3 flex items-center justify-between rounded-xl bg-fire/10 px-3 py-2">
          <div>
            <div className="text-[13px] font-bold">Cinta inclinada</div>
            <div className="num text-[10.5px] text-white/50">{treadMin} min</div>
          </div>
          <span className="num flex items-center gap-0.5 text-[13px] font-bold text-fire">
            <Flame size={11} />
            {fmt(treadKcal)}
          </span>
        </div>
      )}

      {sessions.length > 0 ? (
        <div className="mt-3 space-y-1.5">
          {sessions.slice(0, 2).map((s) => (
            <div key={s.id} className="rounded-xl bg-neon/10 px-3 py-2">
              <div className="truncate text-[13px] font-bold">{s.routineName}</div>
              <div className="num text-[10.5px] text-white/50">
                {fmtClock(s.durationSec)} · {fmt(s.volume)} kg
              </div>
            </div>
          ))}
          <div className="num flex items-center justify-between px-0.5 text-[12px]">
            <span className="text-white/45">{fmt(vol)} kg levantados</span>
            <span className="flex items-center gap-0.5 font-bold text-fire">
              <Flame size={11} />
              {fmt(kcal)}
            </span>
          </div>
        </div>
      ) : (
        <div className="mt-3">
          {planDay && (
            <div className="mb-2.5 rounded-xl bg-neon/10 px-3 py-2">
              <div className="text-[13px] font-bold">{planDay.name} · {planDay.focus}</div>
              <div className="num text-[10.5px] text-white/50">
                {routine ? `${routine.exercises.length} ejercicios · ${routine.exercises.reduce((n, e) => n + e.sets, 0)} series` : 'rutina libre'}
              </div>
            </div>
          )}
          <p className="text-[11px] leading-snug text-white/45">Músculos recuperados</p>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {fresh.slice(0, 4).map((m) => (
              <span key={m} className="rounded-full border border-emerald/25 bg-emerald/10 px-2 py-0.5 text-[10.5px] font-semibold text-emerald">
                {m}
              </span>
            ))}
            {fresh.length > 4 && <span className="num px-1 text-[10.5px] text-white/40">+{fresh.length - 4}</span>}
            {fresh.length === 0 && <span className="text-[11px] text-white/40">Todo en recuperación</span>}
          </div>
        </div>
      )}

      {today && (
        <button
          className="btn-violet mt-auto w-full !py-2.5 pt-2.5 text-[13px]"
          onClick={() => {
            haptic(20)
            setActive(buildActive(routine && routine.exercises.length ? routine : null, state.sessions))
          }}
          style={{ marginTop: 'auto' }}
        >
          <Play size={14} fill="currentColor" /> {sessions.length ? 'Otra sesión' : 'Iniciar sesión'}
        </button>
      )}
    </section>
  )
}

export function Today() {
  const { targets, totals, streak, state } = useStore()
  const desk = useDesktop()
  const [date, setDate] = useState(todayKey())
  if (!targets || !state.profile) return null

  const t = totals(date)
  const budget = targets.kcal + t.burned
  const remaining = budget - t.consumed
  const over = remaining < 0
  const isToday = date === todayKey()

  return (
    <div className="px-4 pb-8 lg:px-0 lg:pb-0">
      <header className="flex items-center justify-between px-1 pt-4 lg:pt-0">
        <div>
          <p className="label">{keyToDate(date).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          <div className="mt-1.5 flex items-center gap-3">
            <h1 className="text-[28px] font-extrabold leading-none tracking-tight lg:text-[38px]">{isToday ? greeting() : 'Resumen'}</h1>
            <span className="hidden lg:inline-flex">
              <StreakBadge days={streak} />
            </span>
          </div>
        </div>
      </header>

      <div className="mt-4 lg:mt-6">
        <WeekStrip selected={date} onSelect={setDate} />
      </div>

      <QuickActions date={date} className="mt-4 lg:hidden" />

      <MagicBar className="mt-4 lg:mt-5" />

      <div className="mt-4 space-y-4 lg:mt-6 lg:grid lg:grid-cols-12 lg:items-stretch lg:gap-6 lg:space-y-0">
        {/* left: calories hero + macros */}
        <div className="space-y-4 lg:col-span-5 lg:flex lg:flex-col lg:space-y-6">
          <motion.section key={date} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="card relative overflow-hidden p-5 lg:flex-1 lg:p-7">
            <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-emerald/[0.14] blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-aqua/[0.09] blur-3xl" />
            <div className="relative flex items-center justify-between">
              <p className="label">Balance energético</p>
              <p className="num text-[11px] text-white/35">{fmt(targets.kcal)} kcal/día</p>
            </div>

            <div className="relative my-4 flex justify-center lg:my-8">
              <Ring size={desk ? 280 : 196} stroke={desk ? 22 : 17} value={t.consumed / budget} gradient={over ? ['#F97316', '#FBBF24'] : ['#10B981', '#06B6D4']}>
                <Ring size={desk ? 214 : 148} stroke={desk ? 12 : 9} value={t.burned / 500} gradient={['#F97316', '#FBBF24']} glow={false}>
                  <div className="text-center">
                    <SpringNumber value={Math.abs(remaining)} className={cn('num text-[42px] font-bold leading-none lg:text-[54px]', over ? 'text-fire' : 'text-white')} />
                    <div className="label mt-1.5 !text-[9.5px]">{over ? 'kcal de más' : 'kcal restantes'}</div>
                  </div>
                </Ring>
              </Ring>
            </div>

            <div className="relative grid grid-cols-3 gap-2 lg:gap-3">
              {[
                { l: 'Consumidas', v: t.consumed, c: 'text-emerald', b: 'border-emerald/20 bg-emerald/[0.07]' },
                { l: 'Quemadas', v: t.burned, c: 'text-fire', b: 'border-fire/20 bg-fire/[0.07]' },
                { l: 'Objetivo', v: targets.kcal, c: 'text-zinc-200', b: 'border-white/[0.08] bg-white/[0.04]' },
              ].map((x) => (
                <div key={x.l} className={cn('rounded-2xl border px-2 py-2.5 text-center lg:py-3.5', x.b)}>
                  <div className="label !text-[9px]">{x.l}</div>
                  <SpringNumber value={x.v} className={cn('num mt-1 block text-[17px] font-bold leading-none lg:text-[21px]', x.c)} />
                </div>
              ))}
            </div>
            {t.burned > 0 && (
              <p className="num relative mt-3 text-center text-[10.5px] text-white/35">
                pasos {fmt(t.stepsKcal)} · cardio {fmt(t.cardioKcal)} · pesas {fmt(t.gymKcal)} kcal
              </p>
            )}
          </motion.section>

          <section className="card space-y-4 p-5 lg:space-y-5 lg:p-7">
            <p className="label">Macronutrientes</p>
            <MacroBar label="Proteína" value={t.protein} target={targets.protein} color="#10B981" />
            <MacroBar label="Carbohidratos" value={t.carbs} target={targets.carbs} color="#06B6D4" />
            <MacroBar label="Grasas" value={t.fat} target={targets.fat} color="#8B5CF6" />
          </section>
        </div>

        {/* right: 2×2 bento */}
        <div className="grid grid-cols-1 gap-3 min-[560px]:grid-cols-2 lg:col-span-7 lg:auto-rows-fr lg:gap-6">
          <HydrationCard date={date} />
          <StepsCard date={date} />
          <WorkoutCard date={date} />
          <WeightCard date={date} />
        </div>
      </div>
    </div>
  )
}
