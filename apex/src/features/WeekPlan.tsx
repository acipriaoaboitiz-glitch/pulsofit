import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Check, Flame, Pencil, Play, Plus } from 'lucide-react'
import { ExercisePicker } from './ExercisePicker'
import { useStore } from '../lib/store'
import { GROUP_COLOR, WEEK_PLAN, WEEK_PROGRAM, WEEK_REPS, exerciseById, exerciseMet, groupOf, todayPlanDay } from '../lib/exercises'
import { DEFAULT_WEIGHT_KG, setKcal } from '../lib/calc'
import { buildActive, lastSetsFor } from '../lib/workout'
import type { Routine } from '../lib/types'
import { cn, fmt, haptic, todayKey } from '../lib/utils'

/** Monday → Friday selector with the routine of the chosen day. Opens on today's weekday. */
export function WeekPlan({ onEdit, className }: { onEdit: (r: Routine) => void; className?: string }) {
  const { state, setActive, saveRoutine } = useStore()
  const [day, setDay] = useState(todayPlanDay())
  const [picker, setPicker] = useState(false)
  const plan = WEEK_PLAN.find((d) => d.day === day)!
  const routine = state.routines.find((r) => r.id === `week-${day}`)
  const bodyKg = state.profile?.weightKg ?? DEFAULT_WEIGHT_KG
  const realToday = todayPlanDay() === day && new Date().getDay() >= 1 && new Date().getDay() <= 5

  const done = realToday && !!routine && state.sessions.some((s) => s.date === todayKey() && s.routineName === routine.name)

  /** planned kcal per exercise: its sets at the last weight you used (or bodyweight work) */
  const rows = useMemo(
    () =>
      (routine?.exercises ?? []).map((e) => {
        const last = lastSetsFor(state.sessions, e.exerciseId)
        const top = last ? [...last].sort((a, b) => b.kg * b.reps - a.kg * a.reps)[0] : undefined
        const kcal = Math.round(e.sets * setKcal(exerciseMet(e.exerciseId), bodyKg, top?.kg ?? 0, e.reps))
        return { e, def: exerciseById(e.exerciseId), top, kcal }
      }),
    [routine, state.sessions, bodyKg],
  )
  const totalSets = rows.reduce((n, r) => n + r.e.sets, 0)
  const totalKcal = rows.reduce((n, r) => n + r.kcal, 0)

  const ensure = (): Routine => routine ?? { id: `week-${day}`, u: Date.now(), name: plan.name, program: WEEK_PROGRAM, exercises: [] }

  const addToDay = (ids: string[]) => {
    const r = ensure()
    saveRoutine({
      id: r.id,
      name: r.name,
      program: r.program,
      exercises: [...r.exercises, ...ids.map((id) => ({ exerciseId: id, sets: 3, reps: WEEK_REPS, restSec: 90 }))],
    })
  }

  const start = () => {
    if (!routine) return
    haptic(20)
    setActive(buildActive(routine, state.sessions))
  }

  return (
    <section className={cn('card p-4 sm:p-5', className)}>
      <div className="mb-4 flex items-center justify-between gap-2">
        <p className="label">Mi semana</p>
        {done && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald/15 px-2.5 py-1 text-[11px] font-bold text-emerald">
            <Check size={12} strokeWidth={3} /> Hecho hoy
          </span>
        )}
      </div>

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="tablist" aria-label="Día de la semana">
        {WEEK_PLAN.map((d) => {
          const on = d.day === day
          const isToday = new Date().getDay() === d.day
          return (
            <button
              key={d.day}
              role="tab"
              aria-selected={on}
              onClick={() => {
                haptic(8)
                setDay(d.day)
              }}
              className={cn('relative shrink-0 rounded-2xl px-4 py-2.5 text-[14px] font-bold transition active:scale-95', on ? 'text-white' : 'text-white/50')}
            >
              {on && <motion.span layoutId="week-day-pill" className="absolute inset-0 rounded-2xl border border-neon/50 bg-neon/20" style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.14), 0 8px 24px -10px rgba(139,92,246,0.7)' }} transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
              <span className="relative flex items-center gap-1.5">
                {d.name}
                {isToday && <span className="h-1.5 w-1.5 rounded-full bg-emerald" aria-label="hoy" />}
              </span>
            </button>
          )
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[22px] font-extrabold leading-none tracking-tight">{plan.name}</h2>
          <p className="mt-1.5 text-[13px] text-white/50">{plan.focus}</p>
        </div>
        {rows.length > 0 && (
          <div className="num flex items-center gap-3 text-[12px] text-white/45">
            <span>
              <b className="text-white">{rows.length}</b> ejercicios
            </span>
            <span>
              <b className="text-white">{totalSets}</b> series
            </span>
            <span className="flex items-center gap-0.5 text-fire">
              <Flame size={12} />~{fmt(totalKcal)} kcal
            </span>
          </div>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-white/[0.12] bg-white/[0.02] px-5 py-8 text-center">
          <p className="text-[15px] font-bold">Día de {plan.focus.toLowerCase()} libre — añade lo que hagas hoy</p>
          <p className="mx-auto mt-1 max-w-[300px] text-[13px] leading-snug text-white/45">Lo que añadas se queda en este día y lo tendrás la próxima semana con tus últimos pesos.</p>
          <button className="btn-violet mt-5 w-full max-w-[320px] !py-3.5 text-[15px]" onClick={() => setPicker(true)}>
            <Plus size={18} strokeWidth={3} /> Añadir ejercicio
          </button>
        </div>
      ) : (
        <>
          <ol className="mt-4 space-y-2 lg:grid lg:grid-cols-2 lg:gap-2.5 lg:space-y-0">
            {rows.map(({ e, def, top, kcal }, i) => {
              const color = def ? GROUP_COLOR[groupOf(def.muscle)] : '#8B5CF6'
              return (
                <li key={`${e.exerciseId}-${i}`} className="card-raised flex items-center gap-3 px-3.5 py-3">
                  <span className="num grid h-8 w-8 shrink-0 place-items-center rounded-xl text-[12px] font-bold" style={{ background: `${color}22`, color }}>
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-[14px] font-bold">{def?.name ?? e.exerciseId}</span>
                      {e.bonus && <span className="shrink-0 rounded-md border border-fire/30 bg-fire/10 px-1.5 py-0.5 text-[9px] font-extrabold tracking-[0.12em] text-fire">BONUS</span>}
                    </div>
                    <div className="num mt-0.5 flex flex-wrap items-center gap-x-2.5 text-[11.5px] text-white/45">
                      <span className="font-bold text-white/70">
                        {e.sets} × {e.reps}
                      </span>
                      {top ? <span>última: {top.kg > 0 ? `${top.kg}kg` : 'PC'} × {top.reps}</span> : <span>primera vez</span>}
                    </div>
                  </div>
                  <span className="num flex shrink-0 items-center gap-0.5 text-[12px] font-bold text-fire">
                    <Flame size={11} />~{kcal}
                  </span>
                </li>
              )
            })}
          </ol>

          <div className="mt-4 grid grid-cols-[1fr_auto_auto] gap-2">
            <button className="btn-violet !py-3.5 text-[15px]" onClick={start}>
              <Play size={16} fill="currentColor" /> {done ? 'Repetir' : 'Empezar'} {plan.name.toLowerCase()}
            </button>
            <button className="btn-ghost !px-3.5" onClick={() => setPicker(true)} aria-label="Añadir ejercicio a este día">
              <Plus size={18} strokeWidth={3} />
            </button>
            <button className="btn-ghost !px-3.5" onClick={() => onEdit(ensure())} aria-label="Editar rutina del día">
              <Pencil size={17} />
            </button>
          </div>
        </>
      )}

      <ExercisePicker open={picker} onClose={() => setPicker(false)} title={`Añadir a ${plan.name}`} exclude={routine?.exercises.map((e) => e.exerciseId)} onPick={addToDay} />
    </section>
  )
}
