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
import { exerciseById, isBarbell } from '../lib/exercises'
import { bestE1rm, isPr, newExercise, sessionVolume } from '../lib/workout'
import { GYM_MET, INTENSITY_LABELS, epley, gymKcal, suggestIntensity } from '../lib/calc'
import type { ActiveWorkout as Active, Intensity, SetLog } from '../lib/types'
import { beep, cn, fmt, fmtClock, haptic, primeAudio, todayKey } from '../lib/utils'

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
    <div className={cn('rounded-2xl border p-2.5 transition-colors', set.done ? 'border-emerald/30 bg-emerald/[0.07]' : 'border-line bg-white/[0.02]')}>
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
          className={cn('ml-auto grid h-[52px] w-[52px] shrink-0 place-items-center rounded-2xl transition-colors', set.done ? 'bg-emerald text-[#04130d] shadow-[0_6px_22px_-6px_rgba(16,185,129,0.8)]' : 'bg-white/[0.09] text-white/45')}
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
  const { state, setActive, addSession } = useStore()
  const ui = useUI()
  const active = state.active
  const [now, setNow] = useState(Date.now())
  const [picker, setPicker] = useState(false)
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
    } else haptic(18)
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
  const weight = state.profile?.weightKg ?? 75
  const liveKcal = gymKcal(suggestIntensity(volume, elapsed / 60), weight, elapsed)

  const plateEx = plates ? active.exercises[plates.ei] : undefined
  const plateSet = plates && plateEx ? plateEx.sets[plates.si] : undefined

  return (
    <motion.div className="fixed inset-0 z-[60] flex flex-col bg-obsidian" initial={{ y: '100%' }} animate={{ y: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 34 }}>
      {burst > 0 && <Confetti key={burst} />}

      {/* header */}
      <div className="border-b border-line px-4 pb-3 pt-[calc(14px+var(--safe-top))]">
        <div className="flex items-center justify-between gap-3">
          <button onClick={() => setDiscarding(true)} aria-label="Descartar entreno" className="grid h-10 w-10 place-items-center rounded-full bg-white/[0.06] text-white/60 active:scale-90">
            <X size={18} />
          </button>
          <div className="min-w-0 flex-1 text-center">
            <div className="truncate text-[15px] font-extrabold">{active.routineName}</div>
            <div className="num text-[13px] font-bold text-neon">{fmtClock(elapsed)}</div>
          </div>
          <button className="btn-violet !rounded-full !px-4 !py-2.5 text-[14px]" onClick={() => setFinishing(true)}>
            Terminar
          </button>
        </div>
        <div className="mt-3 flex items-center gap-3 text-[12px] text-white/50">
          <span className="num">
            <b className="text-white">{doneSets}</b>/{totalSets} series
          </span>
          <span className="num">
            <b className="text-white">{fmt(volume)}</b> kg
          </span>
          <span className="num flex items-center gap-0.5 text-fire">
            <Flame size={12} />
            <b>{fmt(liveKcal)}</b>
          </span>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-emerald transition-all" style={{ width: `${totalSets ? (doneSets / totalSets) * 100 : 0}%` }} />
          </div>
        </div>
        <div className="mt-2.5 flex items-center gap-2">
          <Timer size={14} className="text-white/40" />
          <span className="label">Descanso</span>
          <div className="ml-auto flex gap-1.5">
            {REST_PRESETS.map((sec) => (
              <button
                key={sec}
                onClick={() => {
                  haptic(6)
                  update((a) => ({ ...a, restTotal: sec, restEndsAt: a.restEndsAt ? Date.now() + sec * 1000 : null }))
                }}
                className={cn('num rounded-lg px-2.5 py-1.5 text-[12px] font-bold transition', active.restTotal === sec ? 'bg-neon text-white' : 'bg-white/[0.07] text-white/55')}
              >
                {sec}s
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* exercises */}
      <div className="flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 pb-[170px] pt-4">
        {active.exercises.length === 0 && <p className="py-10 text-center text-sm text-white/40">Sesión libre: añade ejercicios según lo que hagas hoy.</p>}
        {active.exercises.map((ex, ei) => {
          const def = exerciseById(ex.exerciseId)
          const best = bests.get(ex.exerciseId)
          return (
            <section key={`${ex.exerciseId}-${ei}`} className="card p-3.5">
              <div className="mb-3 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="truncate text-[16px] font-extrabold leading-tight">{def?.name ?? ex.exerciseId}</h3>
                  <p className="num text-[12px] text-white/45">
                    {def?.muscle} · {def?.equipment}
                    {best ? <span className="ml-1.5 text-violet-300">· mejor 1RM {Math.round(best)} kg</span> : <span className="ml-1.5">· primera vez</span>}
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

              <button className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl py-2.5 text-[13px] font-bold text-white/50 active:bg-white/[0.05]" onClick={() => addSet(ei)}>
                <Plus size={15} strokeWidth={3} /> Añadir serie
              </button>
            </section>
          )
        })}

        <button className="btn-ghost w-full" onClick={() => setPicker(true)}>
          <Plus size={18} /> Añadir ejercicio
        </button>
      </div>

      {/* PR toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ y: -80, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 24 }}
            className="absolute inset-x-4 top-[calc(78px+var(--safe-top))] z-10 flex items-center gap-3 rounded-2xl bg-gradient-to-r from-violet-500 to-neon p-3.5 text-white shadow-[0_12px_40px_-8px_rgba(139,92,246,0.9)]"
          >
            <Trophy size={26} />
            <span className="text-[14px] font-extrabold leading-tight">{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* floating circular rest timer */}
      <AnimatePresence>
        {(resting || restDone) && (
          <motion.div
            initial={{ y: 60, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            className="absolute inset-x-4 bottom-[calc(16px+var(--safe-bottom))] z-20 flex items-center gap-3 rounded-[28px] border border-neon/30 bg-[#12101f]/95 p-2.5 pr-3 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.9)]"
          >
            <Ring size={64} stroke={6} value={resting ? rest / active.restTotal : restDone ? 1 : 0} color={restDone ? '#10B981' : '#8B5CF6'} glow={false}>
              <span className="num text-[15px] font-bold">{resting ? fmtClock(Math.ceil(rest)) : '00:00'}</span>
            </Ring>
            <div className="min-w-0 flex-1">
              {resting ? (
                <>
                  <p className="label !text-neon">Descanso</p>
                  <div className="mt-1.5 flex gap-1.5">
                    <button className="num rounded-lg bg-white/[0.08] px-2.5 py-1.5 text-[12px] font-bold" onClick={() => update((a) => ({ ...a, restEndsAt: (a.restEndsAt ?? Date.now()) - 15000 }))}>
                      −15
                    </button>
                    <button className="num rounded-lg bg-white/[0.08] px-2.5 py-1.5 text-[12px] font-bold" onClick={() => update((a) => ({ ...a, restEndsAt: (a.restEndsAt ?? Date.now()) + 15000 }))}>
                      +15
                    </button>
                    <button className="rounded-lg bg-white/[0.08] px-2.5 py-1.5 text-[12px] font-bold" onClick={() => update((a) => ({ ...a, restEndsAt: null }))}>
                      Saltar
                    </button>
                  </div>
                </>
              ) : (
                <p className="text-[14px] font-extrabold text-emerald">¡Descanso terminado! Siguiente serie</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ExercisePicker
        open={picker}
        onClose={() => setPicker(false)}
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
        onConfirm={(intensity) => {
          const done = active.exercises
            .map((e) => ({ exerciseId: e.exerciseId, restSec: e.restSec, sets: e.sets.filter((s) => s.done) }))
            .filter((e) => e.sets.length > 0)
          const durationSec = Math.max(60, Math.round(elapsed))
          const kcal = gymKcal(intensity, weight, durationSec)
          const prs = done.flatMap((e) => e.sets.filter((s) => s.pr).map((s) => ({ exercise: exerciseById(e.exerciseId)?.name ?? e.exerciseId, e1rm: Math.round(epley(s.kg, s.reps)) })))
          const vol = sessionVolume(done)
          addSession({ date: todayKey(), routineName: active.routineName, startedAt: active.startedAt, durationSec, intensity, kcal, volume: vol, prCount: prs.length, exercises: done })
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

function FinishSheet({ open, onClose, active, durationSec, onConfirm }: { open: boolean; onClose: () => void; active: Active; durationSec: number; onConfirm: (i: Intensity) => void }) {
  const { state } = useStore()
  const weight = state.profile?.weightKg ?? 75
  const done = active.exercises.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0)
  const dur = Math.max(60, Math.round(durationSec))
  const vol = sessionVolume(active.exercises)
  const suggested = suggestIntensity(vol, dur / 60)
  const [choice, setChoice] = useState<Intensity | null>(null)
  const intensity = choice ?? suggested

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
          <div>
            <p className="label mb-2">Intensidad (sugerida por tu volumen y ritmo)</p>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(INTENSITY_LABELS) as Intensity[]).map((k) => (
                <button key={k} onClick={() => setChoice(k)} className={cn('rounded-2xl border py-3 text-center transition active:scale-95', intensity === k ? 'border-neon/60 bg-neon/15 text-white' : 'border-line bg-white/[0.03] text-white/55')}>
                  <div className="text-[14px] font-bold">
                    {INTENSITY_LABELS[k]}
                    {k === suggested && <span className="ml-1 text-[10px] text-neon">●</span>}
                  </div>
                  <div className="num text-[11px] text-white/40">MET {GYM_MET[k]}</div>
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-fire/25 bg-fire/[0.07] p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="label !text-fire/80">Calorías quemadas</div>
                <div className="num text-[11px] text-white/40">
                  0,0175 × {GYM_MET[intensity]} MET × {weight} kg × {(dur / 60).toFixed(0)} min
                </div>
                <div className="num text-[11px] text-white/40">{fmt(vol)} kg de volumen</div>
              </div>
              <div className="num flex items-center gap-1 text-[34px] font-bold text-fire">
                <Flame size={22} />
                {fmt(gymKcal(intensity, weight, dur))}
              </div>
            </div>
          </div>
          <button className="btn-violet w-full" onClick={() => onConfirm(intensity)}>
            Guardar y sumar al balance del día
          </button>
        </div>
      )}
    </Sheet>
  )
}
