import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronsUp, Copy, Disc3, Flame, Minus, Plus, Timer, Trash2, Trophy, X } from 'lucide-react'
import { Sheet } from '../components/Sheet'
import { Ring } from '../components/Ring'
import { Confetti } from '../components/Confetti'
import { ExercisePicker } from './ExercisePicker'
import { PlateSheet } from './PlateSheet'
import { useStore } from '../lib/store'
import { useUI } from '../lib/ui'
import { GROUPS, GROUP_COLOR, exerciseById, exerciseMet, groupOf, isBarbell } from '../lib/exercises'
import type { Group } from '../lib/exercises'
import { bestE1rm, isPr, lastSetsFor, newExercise, sessionVolume, workoutKcal } from '../lib/workout'
import { DEFAULT_WEIGHT_KG, epley, exerciseSetsKcal, suggestIntensity } from '../lib/calc'
import type { ActiveWorkout as Active, Intensity, SetLog } from '../lib/types'
import { beep, cn, fmt, fmtClock, fmtHms, haptic, primeAudio, todayKey, uid } from '../lib/utils'

const REST_PRESETS = [60, 90, 120, 180]

function StepBtn({ label, children, onClick, wide }: { label: string; children: React.ReactNode; onClick: () => void; wide?: boolean }) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      whileTap={{ scale: 0.88 }}
      onClick={() => {
        haptic(6)
        onClick()
      }}
      className={cn('num grid h-10 shrink-0 place-items-center rounded-xl bg-white/[0.07] text-[12px] font-bold text-white/80 active:bg-white/15', wide ? 'w-11' : 'w-9')}
    >
      {children}
    </motion.button>
  )
}

interface SetRowProps {
  index: number
  set: SetLog
  barbell: boolean
  canCopy: boolean
  onChange: (p: Partial<SetLog>) => void
  onCopy: () => void
  onToggle: () => void
  onPlates: () => void
}

function SetRow({ index, set, barbell, canCopy, onChange, onCopy, onToggle, onPlates }: SetRowProps) {
  const e1 = epley(set.kg, set.reps)
  const bump = (d: number) => onChange({ kg: Math.max(0, Math.round((set.kg + d) * 100) / 100) })
  return (
    <div className={cn('rounded-2xl border p-2.5 transition-colors', set.done ? (set.pr ? 'border-neon/45 bg-neon/[0.11] shadow-[0_0_24px_-10px_rgba(139,92,246,0.9)]' : 'border-emerald/35 bg-emerald/[0.08] shadow-[0_0_24px_-12px_rgba(16,185,129,0.9)]') : 'border-white/[0.07] bg-white/[0.025]')}>
      {/* kg */}
      <div className="flex items-center gap-1">
        <span
          className={cn('num mr-1 grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[12px] font-bold', set.pr ? 'bg-neon text-white' : 'bg-white/[0.06] text-white/70')}
          title={set.pr ? 'Récord personal' : undefined}
        >
          {set.pr ? <Trophy size={14} /> : index + 1}
        </span>
        <StepBtn wide label="Menos 2,5 kilos" onClick={() => bump(-2.5)}>-2.5</StepBtn>
        <StepBtn label="Menos 1 kilo" onClick={() => bump(-1)}>-1</StepBtn>
        <div className="relative min-w-0 flex-1">
          <input
            className="num h-10 w-full rounded-xl border border-line bg-raised text-center text-[18px] font-bold outline-none focus:border-neon/70"
            inputMode="decimal"
            value={set.kg === 0 ? '' : String(set.kg)}
            placeholder="0"
            aria-label={`Peso serie ${index + 1} en kilos`}
            onChange={(e) => {
              const v = e.target.value.replace(',', '.')
              if (/^\d{0,3}(\.\d{0,2})?$/.test(v)) onChange({ kg: v === '' ? 0 : parseFloat(v) || 0 })
            }}
          />
          <span className="pointer-events-none absolute bottom-0.5 right-2 text-[9px] font-bold text-white/30">KG</span>
        </div>
        <StepBtn label="Más 1 kilo" onClick={() => bump(1)}>+1</StepBtn>
        <StepBtn wide label="Más 2,5 kilos" onClick={() => bump(2.5)}>+2.5</StepBtn>
        {barbell && (
          <button type="button" aria-label="Calculadora de discos" onClick={onPlates} className="grid h-10 w-9 shrink-0 place-items-center rounded-xl bg-neon/15 text-violet-200 active:scale-90">
            <Disc3 size={17} />
          </button>
        )}
      </div>

      {/* reps + copy + check */}
      <div className="mt-2 flex items-center gap-1.5">
        <StepBtn label="Una repetición menos" onClick={() => onChange({ reps: Math.max(0, set.reps - 1) })}>
          <Minus size={15} />
        </StepBtn>
        <div className="relative w-[66px] shrink-0">
          <input
            className="num h-10 w-full rounded-xl border border-line bg-raised text-center text-[18px] font-bold outline-none focus:border-neon/70"
            inputMode="numeric"
            value={set.reps === 0 ? '' : String(set.reps)}
            placeholder="0"
            aria-label={`Repeticiones serie ${index + 1}`}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, '').slice(0, 3)
              onChange({ reps: v === '' ? 0 : parseInt(v, 10) })
            }}
          />
          <span className="pointer-events-none absolute bottom-0.5 right-1.5 text-[9px] font-bold text-white/30">REPS</span>
        </div>
        <StepBtn label="Una repetición más" onClick={() => onChange({ reps: set.reps + 1 })}>
          <Plus size={15} />
        </StepBtn>

        <button
          type="button"
          disabled={!canCopy}
          onClick={() => {
            haptic(10)
            onCopy()
          }}
          aria-label="Copiar la serie anterior"
          className="flex h-10 items-center gap-1 rounded-xl bg-white/[0.07] px-2.5 text-[11px] font-bold text-white/70 active:scale-95 disabled:opacity-25"
        >
          <Copy size={13} />
          Copiar
        </button>

        <motion.button
          type="button"
          whileTap={{ scale: 0.86 }}
          onClick={onToggle}
          aria-label={set.done ? 'Desmarcar serie' : 'Completar serie'}
          aria-pressed={set.done}
          className={cn('ml-auto grid h-14 w-14 shrink-0 place-items-center rounded-[18px] transition-colors', set.done ? (set.pr ? 'bg-neon text-white shadow-[0_6px_22px_-6px_rgba(139,92,246,0.9)]' : 'bg-emerald text-[#04130d] shadow-[0_6px_22px_-6px_rgba(16,185,129,0.8)]') : 'border border-white/[0.1] bg-white/[0.07] text-white/40')}
        >
          <motion.span animate={{ scale: set.done ? [1, 1.35, 1] : 1 }} transition={{ duration: 0.3 }}>
            <Check size={26} strokeWidth={3.5} />
          </motion.span>
        </motion.button>
      </div>

      {e1 > 0 && (
        <p className="num mt-1.5 flex items-center gap-1 text-[11px] text-white/40">
          <ChevronsUp size={12} />
          1RM est. <b className={cn(set.pr ? 'text-violet-300' : 'text-white/60')}>{Math.round(e1)} kg</b>
          {set.pr && <span className="ml-1 rounded-md bg-neon px-1.5 py-0.5 text-[10px] font-extrabold text-white">NEW PR</span>}
        </p>
      )}
    </div>
  )
}

export function ActiveWorkout() {
  const { state, setActive, addSession, saveRoutine } = useStore()
  const ui = useUI()
  const active = state.active
  const [now, setNow] = useState(Date.now())
  const [picker, setPicker] = useState(false)
  const [pickerGroup, setPickerGroup] = useState<Group | undefined>(undefined)
  const [finishing, setFinishing] = useState(false)
  const [discarding, setDiscarding] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [burst, setBurst] = useState(0)
  const [restDone, setRestDone] = useState(false)
  const [plates, setPlates] = useState<{ ei: number; si: number } | null>(null)
  const firedFor = useRef<number | null>(null)

  useEffect(() => {
    if (!active) return
    const t = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(t)
  }, [active])

  // rest timer end → beep + vibration
  const restEndsAt = active?.restEndsAt ?? null
  useEffect(() => {
    if (!restEndsAt || now < restEndsAt || firedFor.current === restEndsAt) return
    firedFor.current = restEndsAt
    beep(3)
    haptic([200, 100, 200, 100, 400])
    setRestDone(true)
    setActive(active ? { ...active, restEndsAt: null } : null)
    window.setTimeout(() => setRestDone(false), 4000)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now, restEndsAt])

  // open the exercise picker from the global "+" menu while a workout is running
  useEffect(() => {
    if (active && ui.sheet?.name === 'addExercise') {
      setPicker(true)
      ui.close()
    }
  }, [active, ui])

  const bests = useMemo(() => {
    const m = new Map<string, number | null>()
    if (active) for (const e of active.exercises) m.set(e.exerciseId, bestE1rm(state.sessions, e.exerciseId))
    return m
  }, [active?.exercises.length, state.sessions]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!active) return null

  const update = (fn: (a: Active) => Active) => setActive(fn(active))
  const setField = (ei: number, si: number, p: Partial<SetLog>) =>
    update((a) => ({ ...a, exercises: a.exercises.map((e, i) => (i !== ei ? e : { ...e, sets: e.sets.map((s, j) => (j !== si ? s : { ...s, ...p })) })) }))

  const toggleSet = (ei: number, si: number) => {
    primeAudio()
    const ex = active.exercises[ei]!
    const s = ex.sets[si]!
    if (s.done) {
      setField(ei, si, { done: false, pr: undefined })
      return
    }
    const pr = isPr(bests.get(ex.exerciseId) ?? null, ex.sets.slice(0, si), s)
    update((a) => ({
      ...a,
      restEndsAt: Date.now() + a.restTotal * 1000,
      exercises: a.exercises.map((e, i) => (i !== ei ? e : { ...e, sets: e.sets.map((x, j) => (j !== si ? x : { ...x, done: true, pr: pr || undefined })) })),
    }))
    firedFor.current = null
    setRestDone(false)
    if (pr) {
      haptic([30, 60, 30, 60, 120])
      beep(2)
      setBurst((b) => b + 1)
      setToast(`NEW PR · ${exerciseById(ex.exerciseId)?.name ?? ''} · 1RM est. ${Math.round(epley(s.kg, s.reps))} kg`)
      window.setTimeout(() => setToast(null), 3400)
    } else haptic(20)
  }

  const addSet = (ei: number) =>
    update((a) => ({
      ...a,
      exercises: a.exercises.map((e, i) => {
        if (i !== ei) return e
        const last = e.sets[e.sets.length - 1]
        return { ...e, sets: [...e.sets, { kg: last?.kg ?? 0, reps: last?.reps ?? 10, done: false }] }
      }),
    }))

  const elapsed = (now - active.startedAt) / 1000
  const rest = active.restEndsAt ? Math.max(0, (active.restEndsAt - now) / 1000) : 0
  const resting = !!active.restEndsAt
  const doneSets = active.exercises.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0)
  const totalSets = active.exercises.reduce((n, e) => n + e.sets.length, 0)
  const volume = sessionVolume(active.exercises)
  const weight = state.profile?.weightKg ?? DEFAULT_WEIGHT_KG
  const liveKcal = workoutKcal(active.exercises, weight)

  const plateEx = plates ? active.exercises[plates.ei] : undefined
  const plateSet = plates && plateEx ? plateEx.sets[plates.si] : undefined

  return (
    <motion.div className="fixed inset-0 z-[60] flex flex-col bg-[#04060A] lg:left-64 lg:flex-row" initial={{ y: '100%' }} animate={{ y: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 34 }}>
      {burst > 0 && <Confetti key={burst} />}

      {/* header: live session bar */}
      <div className="px-4 pb-3 transition-[padding] duration-300 lg:order-2 lg:w-[380px] lg:shrink-0 lg:overflow-y-auto lg:border-l lg:border-white/[0.06] lg:bg-[#070A10]/80 lg:px-6 lg:!pt-8" style={{ paddingTop: resting || restDone ? "calc(68px + var(--safe-top))" : "calc(14px + var(--safe-top))" }}>
        <div className="flex items-center justify-between gap-3">
          <button onClick={() => setDiscarding(true)} aria-label="Descartar entreno" className="grid h-10 w-10 place-items-center rounded-full border border-white/[0.08] bg-white/[0.05] text-white/60 active:scale-90">
            <X size={18} />
          </button>
          <div className="min-w-0 flex-1 text-center">
            <div className="label flex items-center justify-center gap-1.5 !text-neon">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-neon opacity-70" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-neon" />
              </span>
              Sesión en vivo
            </div>
            <div className="mt-0.5 truncate text-[15px] font-extrabold">{active.routineName}</div>
          </div>
          <button className="btn-violet !rounded-full !px-4 !py-2.5 text-[14px]" onClick={() => setFinishing(true)}>
            Terminar
          </button>
        </div>

        <div className="card mt-3 grid grid-cols-3 divide-x divide-white/[0.07] py-3">
          <div className="text-center">
            <div className="label !text-[9px]">Tiempo</div>
            <div className="num mt-1 text-[20px] font-bold leading-none text-violet-300 lg:text-[24px]">{fmtHms(elapsed)}</div>
          </div>
          <div className="text-center">
            <div className="label !text-[9px]">Volumen</div>
            <div className="num mt-1 text-[20px] font-bold leading-none">
              {fmt(volume)}
              <span className="ml-0.5 text-[10px] text-white/40">kg</span>
            </div>
          </div>
          <div className="text-center">
            <div className="label !text-[9px]">Calorías</div>
            <div className="num mt-1 flex items-center justify-center gap-0.5 text-[20px] font-bold leading-none text-fire">
              <Flame size={14} />
              {fmt(liveKcal)}
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-3">
          <span className="num text-[11px] text-white/50">
            <b className="text-white">{doneSets}</b>/{totalSets} series
          </span>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.08]">
            <div className="h-full rounded-full bg-gradient-to-r from-emerald to-aqua transition-all" style={{ width: `${totalSets ? (doneSets / totalSets) * 100 : 0}%` }} />
          </div>
          <Timer size={13} className="text-white/40" />
          <div className="flex gap-1">
            {REST_PRESETS.map((sec) => (
              <button
                key={sec}
                onClick={() => {
                  haptic(6)
                  update((a) => ({ ...a, restTotal: sec, restEndsAt: a.restEndsAt ? Date.now() + sec * 1000 : null }))
                }}
                className={cn('num rounded-lg px-2 py-1 text-[11px] font-bold transition', active.restTotal === sec ? 'bg-neon text-white' : 'bg-white/[0.07] text-white/55')}
              >
                {sec}
              </button>
            ))}
          </div>
        </div>

        <AnimatePresence initial={false}>
          {(resting || restDone) && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-4 hidden overflow-hidden lg:block">
              <div className="card flex items-center gap-4 p-4">
                <Ring size={88} stroke={8} value={resting ? rest / active.restTotal : restDone ? 1 : 0} gradient={restDone ? ['#10B981', '#06B6D4'] : ['#8B5CF6', '#C4B5FD']} glow={false}>
                  <span className="num text-[17px] font-bold">{resting ? fmtClock(Math.ceil(rest)) : '0:00'}</span>
                </Ring>
                {resting ? (
                  <div className="flex flex-1 flex-col gap-2">
                    <span className="label !text-neon">Descanso</span>
                    <div className="flex gap-1.5">
                      <button className="num flex-1 rounded-xl bg-white/[0.09] py-2 text-[12px] font-bold active:scale-95" onClick={() => update((a) => ({ ...a, restEndsAt: (a.restEndsAt ?? Date.now()) - 15000 }))}>
                        −15s
                      </button>
                      <button className="num flex-1 rounded-xl bg-white/[0.09] py-2 text-[12px] font-bold active:scale-95" onClick={() => update((a) => ({ ...a, restEndsAt: (a.restEndsAt ?? Date.now()) + 15000 }))}>
                        +15s
                      </button>
                      <button className="flex-1 rounded-xl bg-neon py-2 text-[12px] font-bold text-white active:scale-95" onClick={() => update((a) => ({ ...a, restEndsAt: null }))}>
                        Saltar
                      </button>
                    </div>
                  </div>
                ) : (
                  <span className="text-[15px] font-extrabold text-emerald">¡Siguiente serie!</span>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* exercises */}
      <div className="flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 pb-[170px] pt-4 lg:order-1 lg:grid lg:auto-rows-max lg:grid-cols-2 lg:content-start lg:items-start lg:gap-5 lg:space-y-0 lg:px-8 lg:pt-8">
        {active.exercises.length === 0 && <p className="py-10 text-center text-sm text-white/40 lg:col-span-2">Sesión libre: añade ejercicios según lo que hagas hoy.</p>}
        {active.exercises.map((ex, ei) => {
          const def = exerciseById(ex.exerciseId)
          const best = bests.get(ex.exerciseId)
          const grp = def ? groupOf(def.muscle) : undefined
          const color = grp ? GROUP_COLOR[grp] : '#8B5CF6'
          const prev = lastSetsFor(state.sessions, ex.exerciseId)
          const top = prev ? [...prev].sort((a, b) => b.kg * b.reps - a.kg * a.reps)[0] : undefined
          return (
            <section key={`${ex.exerciseId}-${ei}`} className="card overflow-hidden p-3.5">
              <span aria-hidden className="absolute inset-y-4 left-0 w-[3px] rounded-r-full" style={{ background: color, boxShadow: `0 0 14px ${color}` }} />
              <div className="mb-3 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                    <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em]" style={{ background: `${color}1f`, color }}>
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
                      {grp ?? 'Otro'}
                    </span>
                    {ex.bonus && <span className="rounded-md border border-fire/30 bg-fire/10 px-1.5 py-0.5 text-[9px] font-extrabold tracking-[0.12em] text-fire">BONUS</span>}
                    {top ? (
                      <span className="num rounded-full bg-white/[0.06] px-2 py-0.5 text-[10.5px] text-white/65">
                        Última vez: <b className="text-white">{top.kg > 0 ? `${top.kg}kg` : 'PC'} × {top.reps}</b>
                      </span>
                    ) : (
                      <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10.5px] text-white/45">Primera vez</span>
                    )}
                  </div>
                  <h3 className="truncate text-[16px] font-extrabold leading-tight">{def?.name ?? ex.exerciseId}</h3>
                  <span className="num mt-1.5 inline-flex items-center gap-1 rounded-full border border-fire/25 bg-fire/10 px-2.5 py-1 text-[11.5px] font-bold text-fire">
                    <Flame size={11} />~{exerciseSetsKcal(exerciseMet(ex.exerciseId), weight, ex.sets)} kcal · {ex.sets.filter((x) => x.done).length} {ex.sets.filter((x) => x.done).length === 1 ? 'serie' : 'series'}
                    <span className="font-semibold text-fire/60">MET {exerciseMet(ex.exerciseId).toFixed(1)}</span>
                  </span>
                  <p className="num text-[11.5px] text-white/40">
                    {def?.equipment}
                    {best ? <span className="ml-1.5 text-violet-300">· mejor 1RM {Math.round(best)} kg</span> : null}
                  </p>
                </div>
                <button aria-label="Quitar ejercicio" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-white/30 active:text-fire" onClick={() => update((a) => ({ ...a, exercises: a.exercises.filter((_, i) => i !== ei) }))}>
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="space-y-2">
                {ex.sets.map((s, si) => (
                  <SetRow
                    key={si}
                    index={si}
                    set={s}
                    barbell={isBarbell(ex.exerciseId)}
                    canCopy={si > 0}
                    onChange={(p) => setField(ei, si, p)}
                    onCopy={() => {
                      const prev = ex.sets[si - 1]
                      if (prev) setField(ei, si, { kg: prev.kg, reps: prev.reps })
                    }}
                    onToggle={() => toggleSet(ei, si)}
                    onPlates={() => setPlates({ ei, si })}
                  />
                ))}
              </div>

              <div className="mt-2 grid grid-cols-2 gap-2">
                <button className="flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-[13px] font-bold text-white/55 active:bg-white/[0.05]" onClick={() => addSet(ei)}>
                  <Plus size={15} strokeWidth={3} /> Añadir serie
                </button>
                <button
                  disabled={ex.sets.length <= 1}
                  className="flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-[13px] font-bold text-white/55 active:bg-white/[0.05] disabled:opacity-25"
                  onClick={() => {
                    haptic(8)
                    update((a) => ({ ...a, exercises: a.exercises.map((e, i) => (i !== ei ? e : { ...e, sets: e.sets.slice(0, -1) })) }))
                  }}
                >
                  <Minus size={15} strokeWidth={3} /> Quitar serie
                </button>
              </div>
            </section>
          )
        })}

        <section className="card p-4 lg:col-span-2">
          <button
            className="btn-violet mb-3 w-full !py-3.5 text-[15px]"
            onClick={() => {
              setPickerGroup(undefined)
              setPicker(true)
            }}
          >
            <Plus size={18} strokeWidth={3} /> Añadir ejercicio extra
          </button>
          <p className="label mb-2.5">o por músculo</p>
          <div className="flex flex-wrap gap-2">
            {GROUPS.map((g) => (
              <button
                key={g}
                onClick={() => {
                  haptic(8)
                  setPickerGroup(g)
                  setPicker(true)
                }}
                className="inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[13px] font-bold transition active:scale-95"
                style={{ background: `${GROUP_COLOR[g]}14`, borderColor: `${GROUP_COLOR[g]}40`, color: GROUP_COLOR[g] }}
              >
                <Plus size={13} strokeWidth={3} />
                {g}
              </button>
            ))}
          </div>
        </section>
      </div>

      {/* PR toast */}
      <div className="pointer-events-none absolute inset-x-0 bottom-[calc(24px+var(--safe-bottom))] z-10 flex justify-center px-4">
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ y: 80, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 24 }}
            className="pointer-events-auto flex w-full max-w-[560px] items-center gap-3 rounded-2xl bg-gradient-to-r from-violet-500 to-neon p-3.5 text-white shadow-[0_12px_40px_-8px_rgba(139,92,246,0.9)]"
          >
            <Trophy size={26} />
            <span className="text-[14px] font-extrabold leading-tight">{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>
      </div>

      {/* rest timer: Dynamic-Island style pill at the top */}
      <div className="pointer-events-none absolute inset-x-0 top-[calc(8px+var(--safe-top))] z-30 flex justify-center px-4 lg:hidden">
        <AnimatePresence>
          {(resting || restDone) && (
            <motion.div
              initial={{ y: -40, opacity: 0, scale: 0.6 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: -40, opacity: 0, scale: 0.7 }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className="pointer-events-auto flex items-center gap-2.5 rounded-full border border-white/10 bg-black py-1.5 pl-1.5 pr-2 shadow-[0_18px_40px_-10px_rgba(0,0,0,0.95),0_0_0_1px_rgba(139,92,246,0.25)]"
            >
              <Ring size={46} stroke={5} value={resting ? rest / active.restTotal : restDone ? 1 : 0} gradient={restDone ? ['#10B981', '#06B6D4'] : ['#8B5CF6', '#C4B5FD']} glow={false}>
                <span className="num text-[11px] font-bold">{resting ? fmtClock(Math.ceil(rest)) : '0:00'}</span>
              </Ring>
              {resting ? (
                <>
                  <span className="num w-[52px] text-[22px] font-bold leading-none">{fmtClock(Math.ceil(rest))}</span>
                  <button className="num rounded-full bg-white/[0.09] px-2.5 py-1.5 text-[12px] font-bold active:scale-90" onClick={() => update((a) => ({ ...a, restEndsAt: (a.restEndsAt ?? Date.now()) - 15000 }))}>
                    −15s
                  </button>
                  <button className="num rounded-full bg-white/[0.09] px-2.5 py-1.5 text-[12px] font-bold active:scale-90" onClick={() => update((a) => ({ ...a, restEndsAt: (a.restEndsAt ?? Date.now()) + 15000 }))}>
                    +15s
                  </button>
                  <button className="rounded-full bg-neon px-3 py-1.5 text-[12px] font-bold text-white active:scale-90" onClick={() => update((a) => ({ ...a, restEndsAt: null }))}>
                    Saltar
                  </button>
                </>
              ) : (
                <span className="px-2 text-[13px] font-extrabold text-emerald">¡Siguiente serie!</span>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <ExercisePicker
        open={picker}
        initialGroup={pickerGroup}
        onClose={() => {
          setPicker(false)
          setPickerGroup(undefined)
        }}
        exclude={active.exercises.map((e) => e.exerciseId)}
        onPick={(ids) => update((a) => ({ ...a, exercises: [...a.exercises, ...ids.map((id) => newExercise(state.sessions, id))] }))}
      />

      <PlateSheet
        open={plates !== null && !!plateSet}
        kg={plateSet?.kg ?? 0}
        exercise={exerciseById(plateEx?.exerciseId ?? '')?.name ?? ''}
        onClose={() => setPlates(null)}
        onChange={(kg) => plates && setField(plates.ei, plates.si, { kg })}
      />

      <FinishSheet
        open={finishing}
        onClose={() => setFinishing(false)}
        active={active}
        durationSec={elapsed}
        onConfirm={(intensity, routineName) => {
          const done = active.exercises
            .map((e) => ({ exerciseId: e.exerciseId, restSec: e.restSec, sets: e.sets.filter((s) => s.done) }))
            .filter((e) => e.sets.length > 0)
          const durationSec = Math.max(60, Math.round(elapsed))
          const kcal = workoutKcal(done, weight)
          const prs = done.flatMap((e) => e.sets.filter((s) => s.pr).map((s) => ({ exercise: exerciseById(e.exerciseId)?.name ?? e.exerciseId, e1rm: Math.round(epley(s.kg, s.reps)) })))
          const vol = sessionVolume(done)
          addSession({ date: todayKey(), routineName: active.routineName, startedAt: active.startedAt, durationSec, intensity, kcal, volume: vol, prCount: prs.length, exercises: done })
          // optional: keep this session's exercises as one of YOUR routines
          if (routineName.trim()) {
            saveRoutine({
              id: uid(),
              name: routineName.trim(),
              program: 'Mis rutinas',
              exercises: done.map((e) => ({ exerciseId: e.exerciseId, sets: e.sets.length, reps: Math.round(e.sets.reduce((a, s) => a + s.reps, 0) / e.sets.length), restSec: e.restSec ?? 90 })),
            })
          }
          haptic([30, 60, 30, 60, 100])
          setActive(null)
          setFinishing(false)
          ui.setSummary({ routineName: active.routineName, durationSec, kcal, volume: vol, sets: done.reduce((n, e) => n + e.sets.length, 0), prs })
        }}
      />

      <Sheet open={discarding} onClose={() => setDiscarding(false)} title="¿Descartar entreno?" z={80}>
        <p className="mb-5 text-[14px] text-white/60">Se perderán las series registradas en esta sesión y no se guardará nada.</p>
        <div className="grid grid-cols-2 gap-3">
          <button className="btn-ghost" onClick={() => setDiscarding(false)}>
            Seguir
          </button>
          <button
            className="btn bg-fire text-black"
            onClick={() => {
              setDiscarding(false)
              setActive(null)
            }}
          >
            Descartar
          </button>
        </div>
      </Sheet>
    </motion.div>
  )
}

function FinishSheet({ open, onClose, active, durationSec, onConfirm }: { open: boolean; onClose: () => void; active: Active; durationSec: number; onConfirm: (i: Intensity, routineName: string) => void }) {
  const { state } = useStore()
  const [routineName, setRoutineName] = useState('')
  const weight = state.profile?.weightKg ?? DEFAULT_WEIGHT_KG
  const done = active.exercises.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0)
  const dur = Math.max(60, Math.round(durationSec))
  const vol = sessionVolume(active.exercises)
  const intensity = suggestIntensity(vol, dur / 60)
  const total = workoutKcal(active.exercises, weight)

  return (
    <Sheet open={open} onClose={onClose} title="Terminar entreno" z={80}>
      {done === 0 ? (
        <>
          <p className="mb-5 text-[14px] text-white/60">No has completado ninguna serie. Marca al menos una (✓) para guardar la sesión.</p>
          <button className="btn-ghost w-full" onClick={onClose}>
            Volver
          </button>
        </>
      ) : (
        <div className="space-y-5">
          <div className="rounded-2xl border border-fire/25 bg-fire/[0.07] p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="label !text-fire/80">Calorías quemadas (aprox.)</div>
                <div className="num mt-1 text-[11px] text-white/40">
                  {weight} kg · {fmt(vol)} kg levantados · {Math.round(dur / 60)} min
                </div>
              </div>
              <div className="num flex items-center gap-1 text-[34px] font-bold text-fire">
                <Flame size={22} />
                {fmt(total)}
              </div>
            </div>
            <ul className="mt-3 space-y-1.5 border-t border-fire/15 pt-3">
              {active.exercises
                .filter((e) => e.sets.some((s) => s.done))
                .map((e, i) => (
                  <li key={i} className="flex items-center justify-between gap-3 text-[12.5px]">
                    <span className="min-w-0 truncate text-white/70">{exerciseById(e.exerciseId)?.name ?? e.exerciseId}</span>
                    <span className="num shrink-0 text-white/45">
                      {e.sets.filter((s) => s.done).length} series · <b className="text-fire">~{exerciseSetsKcal(exerciseMet(e.exerciseId), weight, e.sets)} kcal</b>
                    </span>
                  </li>
                ))}
            </ul>
            <p className="num mt-2 text-[10.5px] text-white/30">0,0175 × MET (6,0 multiarticular · 4,0 aislamiento) × kg × tiempo + trabajo mecánico</p>
          </div>
          <label className="block">
            <span className="label">Guardar como rutina (opcional)</span>
            <input className="input mt-1.5" placeholder="Ej. Pecho y tríceps" value={routineName} onChange={(e) => setRoutineName(e.target.value)} />
          </label>
          <button className="btn-violet w-full" onClick={() => onConfirm(intensity, routineName)}>
            Guardar y sumar al balance del día
          </button>
        </div>
      )}
    </Sheet>
  )
}
