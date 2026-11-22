import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Flame, Plus, Timer, Trash2, Trophy, X } from 'lucide-react'
import { Sheet } from '../components/Sheet'
import { ExercisePicker } from './ExercisePicker'
import { useStore } from '../lib/store'
import { useUI } from '../lib/ui'
import { exerciseById } from '../lib/exercises'
import { baselineFor, detectPr, lastSetsFor, sessionVolume } from '../lib/workout'
import { GYM_MET, INTENSITY_LABELS, gymKcal } from '../lib/activities'
import type { ActiveWorkout as Active, Intensity, SetLog } from '../lib/types'
import { beep, cn, fmt, fmtClock, haptic, primeAudio, todayKey } from '../lib/utils'

const REST_PRESETS = [60, 90, 120, 180]

export function ActiveWorkout() {
  const { state, setActive, addSession } = useStore()
  const ui = useUI()
  const active = state.active
  const [now, setNow] = useState(Date.now())
  const [picker, setPicker] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const [discarding, setDiscarding] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [restDone, setRestDone] = useState(false)
  const firedFor = useRef<number | null>(null)

  // single ticking clock (250 ms) while a workout is open
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

  const prevSets = useMemo(() => {
    const m = new Map<string, SetLog[] | null>()
    if (active) for (const e of active.exercises) m.set(e.exerciseId, lastSetsFor(state.sessions, e.exerciseId))
    return m
  }, [active, state.sessions])

  if (!active) return null

  const update = (fn: (a: Active) => Active) => setActive(fn(active))

  const setField = (ei: number, si: number, p: Partial<SetLog>) =>
    update((a) => ({
      ...a,
      exercises: a.exercises.map((e, i) =>
        i !== ei ? e : { ...e, sets: e.sets.map((s, j) => (j !== si ? s : { ...s, ...p })) },
      ),
    }))

  const toggleSet = (ei: number, si: number) => {
    primeAudio()
    const ex = active.exercises[ei]
    const s = ex.sets[si]
    if (s.done) {
      setField(ei, si, { done: false, pr: undefined })
      return
    }
    const base = baselineFor(state.sessions, ex.exerciseId)
    const pr = detectPr(base, ex.sets.slice(0, si), s)
    const rest = ex.restSec ?? active.restTotal
    update((a) => ({
      ...a,
      restTotal: rest,
      restEndsAt: Date.now() + rest * 1000,
      exercises: a.exercises.map((e, i) =>
        i !== ei ? e : { ...e, sets: e.sets.map((x, j) => (j !== si ? x : { ...x, done: true, pr })) },
      ),
    }))
    firedFor.current = null
    setRestDone(false)
    if (pr) {
      haptic([30, 60, 30, 60, 120])
      beep(2)
      setToast(`¡Récord personal de ${pr}! ${exerciseById(ex.exerciseId)?.name ?? ''}`)
      window.setTimeout(() => setToast(null), 3200)
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

  const setRestPreset = (sec: number) =>
    update((a) => ({ ...a, restTotal: sec, restEndsAt: a.restEndsAt ? Date.now() + sec * 1000 : null }))

  return (
    <motion.div
      className="fixed inset-0 z-[60] flex flex-col bg-[#080a0f]"
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 34 }}
    >
      {/* header */}
      <div className="border-b border-line px-4 pb-3 pt-[calc(14px+var(--safe-top))]">
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => setDiscarding(true)}
            aria-label="Descartar entreno"
            className="grid h-10 w-10 place-items-center rounded-full bg-white/[0.06] text-white/60 active:scale-90"
          >
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
        <div className="mt-3 flex items-center gap-4 text-[12px] text-white/50">
          <span className="num">
            <b className="text-white">{doneSets}</b>/{totalSets} series
          </span>
          <span className="num">
            <b className="text-white">{fmt(volume)}</b> kg volumen
          </span>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-neon transition-all" style={{ width: `${totalSets ? (doneSets / totalSets) * 100 : 0}%` }} />
          </div>
        </div>
      </div>

      {/* exercises */}
      <div className="flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 pb-[220px] pt-4">
        {active.exercises.length === 0 && (
          <p className="py-10 text-center text-sm text-white/40">Entreno libre: añade ejercicios para empezar.</p>
        )}
        {active.exercises.map((ex, ei) => {
          const def = exerciseById(ex.exerciseId)
          const prev = prevSets.get(ex.exerciseId)
          return (
            <section key={ex.exerciseId} className="card p-4">
              <div className="mb-3 flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-[16px] font-extrabold leading-tight">{def?.name ?? ex.exerciseId}</h3>
                  <p className="text-[12px] text-white/45">{def?.muscle} · {def?.equipment}</p>
                </div>
                <button
                  aria-label="Quitar ejercicio"
                  className="grid h-8 w-8 place-items-center rounded-lg text-white/30 active:text-fire"
                  onClick={() => update((a) => ({ ...a, exercises: a.exercises.filter((_, i) => i !== ei) }))}
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="num mb-1 grid grid-cols-[28px_1fr_68px_60px_44px] items-center gap-2 px-1 text-[10px] font-bold uppercase tracking-wider text-white/35">
                <span>Set</span>
                <span>Anterior</span>
                <span className="text-center">kg</span>
                <span className="text-center">Reps</span>
                <span />
              </div>

              <div className="space-y-1.5">
                {ex.sets.map((s, si) => {
                  const p = prev?.[si] ?? prev?.[prev.length - 1]
                  return (
                    <div
                      key={si}
                      className={cn(
                        'grid grid-cols-[28px_1fr_68px_60px_44px] items-center gap-2 rounded-xl px-1 py-1 transition-colors',
                        s.done && 'bg-emerald/10',
                      )}
                    >
                      <span
                        className={cn(
                          'num grid h-7 w-7 place-items-center rounded-lg text-[12px] font-bold',
                          s.pr ? 'bg-amber-400 text-black' : 'bg-white/[0.06]',
                        )}
                        title={s.pr ? `Récord de ${s.pr}` : undefined}
                      >
                        {s.pr ? <Trophy size={14} /> : si + 1}
                      </span>
                      <span className="num truncate text-[12px] text-white/40">{p ? `${p.kg}kg × ${p.reps}` : '—'}</span>
                      <input
                        className="num h-11 w-full rounded-xl border border-line bg-raised text-center text-[16px] font-bold outline-none focus:border-neon/70"
                        inputMode="decimal"
                        value={s.kg === 0 ? '' : String(s.kg)}
                        placeholder="0"
                        aria-label={`Peso serie ${si + 1}`}
                        onChange={(e) => {
                          const v = e.target.value.replace(',', '.')
                          if (/^\d{0,3}(\.\d{0,2})?$/.test(v)) setField(ei, si, { kg: v === '' ? 0 : parseFloat(v) || 0 })
                        }}
                      />
                      <input
                        className="num h-11 w-full rounded-xl border border-line bg-raised text-center text-[16px] font-bold outline-none focus:border-neon/70"
                        inputMode="numeric"
                        value={s.reps === 0 ? '' : String(s.reps)}
                        placeholder="0"
                        aria-label={`Repeticiones serie ${si + 1}`}
                        onChange={(e) => {
                          const v = e.target.value.replace(/\D/g, '').slice(0, 3)
                          setField(ei, si, { reps: v === '' ? 0 : parseInt(v, 10) })
                        }}
                      />
                      <button
                        onClick={() => toggleSet(ei, si)}
                        aria-label={s.done ? 'Desmarcar serie' : 'Completar serie'}
                        className={cn(
                          'grid h-11 w-11 place-items-center rounded-xl transition active:scale-90',
                          s.done ? 'bg-emerald text-[#04130d]' : 'bg-white/[0.08] text-white/50',
                        )}
                      >
                        <Check size={20} strokeWidth={3.5} />
                      </button>
                    </div>
                  )
                })}
              </div>

              <button
                className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl py-2.5 text-[13px] font-bold text-white/50 active:bg-white/[0.05]"
                onClick={() => addSet(ei)}
              >
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
            className="absolute inset-x-4 top-[calc(78px+var(--safe-top))] z-10 flex items-center gap-3 rounded-2xl bg-gradient-to-r from-amber-300 to-amber-500 p-3.5 text-black shadow-[0_12px_40px_-8px_rgba(251,191,36,0.8)]"
          >
            <Trophy size={26} />
            <span className="text-[14px] font-extrabold leading-tight">{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* rest timer dock */}
      <div className="absolute inset-x-0 bottom-0 border-t border-line bg-[#0d1017]/95 px-4 pb-[calc(14px+var(--safe-bottom))] pt-3 backdrop-blur-xl">
        <div className="mb-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Timer size={18} className={resting ? 'text-neon' : restDone ? 'text-emerald' : 'text-white/40'} />
            {resting ? (
              <span className="num text-[28px] font-bold leading-none text-neon">{fmtClock(Math.ceil(rest))}</span>
            ) : restDone ? (
              <span className="text-[15px] font-extrabold text-emerald">¡Descanso terminado! A por la siguiente</span>
            ) : (
              <span className="text-[14px] font-bold text-white/45">Descanso · se inicia al completar una serie</span>
            )}
          </div>
          {resting && (
            <div className="flex gap-1.5">
              <button
                className="num rounded-lg bg-white/[0.07] px-2.5 py-1.5 text-[12px] font-bold"
                onClick={() => update((a) => ({ ...a, restEndsAt: (a.restEndsAt ?? Date.now()) - 15000 }))}
              >
                −15
              </button>
              <button
                className="num rounded-lg bg-white/[0.07] px-2.5 py-1.5 text-[12px] font-bold"
                onClick={() => update((a) => ({ ...a, restEndsAt: (a.restEndsAt ?? Date.now()) + 15000 }))}
              >
                +15
              </button>
              <button
                className="rounded-lg bg-white/[0.07] px-2.5 py-1.5 text-[12px] font-bold"
                onClick={() => update((a) => ({ ...a, restEndsAt: null }))}
              >
                Saltar
              </button>
            </div>
          )}
        </div>
        <div className="mb-3 h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-neon to-[#c4b5fd] transition-[width] duration-200"
            style={{ width: resting ? `${(rest / active.restTotal) * 100}%` : restDone ? '0%' : '100%', opacity: resting ? 1 : 0.2 }}
          />
        </div>
        <div className="grid grid-cols-4 gap-2">
          {REST_PRESETS.map((sec) => (
            <button
              key={sec}
              onClick={() => {
                haptic(6)
                setRestPreset(sec)
              }}
              className={cn(
                'num rounded-xl py-2.5 text-[13px] font-bold transition active:scale-95',
                active.restTotal === sec ? 'bg-neon text-white' : 'bg-white/[0.07] text-white/60',
              )}
            >
              {sec}s
            </button>
          ))}
        </div>
      </div>

      <ExercisePicker
        open={picker}
        onClose={() => setPicker(false)}
        exclude={active.exercises.map((e) => e.exerciseId)}
        onPick={(ids) =>
          update((a) => ({
            ...a,
            exercises: [
              ...a.exercises,
              ...ids.map((id) => {
                const last = lastSetsFor(state.sessions, id)
                const ref = last?.[0]
                return {
                  exerciseId: id,
                  restSec: 90,
                  sets: Array.from({ length: 3 }, (): SetLog => ({ kg: ref?.kg ?? 0, reps: ref?.reps ?? 10, done: false })),
                }
              }),
            ],
          }))
        }
      />

      <FinishSheet
        open={finishing}
        onClose={() => setFinishing(false)}
        active={active}
        durationSec={elapsed}
        onConfirm={(intensity) => {
          const p = state.profile
          const weight = p?.weightKg ?? 75
          const done = active.exercises
            .map((e) => ({ exerciseId: e.exerciseId, sets: e.sets.filter((s) => s.done) }))
            .filter((e) => e.sets.length > 0)
          const durationSec = Math.max(60, Math.round(elapsed))
          const kcal = gymKcal(intensity, weight, durationSec)
          const prs = done.flatMap((e) =>
            e.sets.filter((s) => s.pr).map((s) => ({ exercise: exerciseById(e.exerciseId)?.name ?? e.exerciseId, kind: s.pr! })),
          )
          const vol = sessionVolume(done)
          addSession({
            date: todayKey(),
            routineName: active.routineName,
            startedAt: active.startedAt,
            durationSec,
            intensity,
            kcal,
            volume: vol,
            prCount: prs.length,
            exercises: done,
          })
          haptic([30, 60, 30, 60, 100])
          setActive(null)
          setFinishing(false)
          ui.setSummary({
            routineName: active.routineName,
            durationSec,
            kcal,
            volume: vol,
            sets: done.reduce((n, e) => n + e.sets.length, 0),
            prs,
          })
        }}
      />

      <Sheet open={discarding} onClose={() => setDiscarding(false)} title="¿Descartar entreno?" z={80}>
        <p className="mb-5 text-[14px] text-white/60">Se perderán las series registradas en esta sesión y no se guardará nada.</p>
        <div className="grid grid-cols-2 gap-3">
          <button className="btn-ghost" onClick={() => setDiscarding(false)}>
            Seguir
          </button>
          <button
            className="btn bg-fire/90 text-black"
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

function FinishSheet({
  open,
  onClose,
  active,
  durationSec,
  onConfirm,
}: {
  open: boolean
  onClose: () => void
  active: Active
  durationSec: number
  onConfirm: (i: Intensity) => void
}) {
  const { state } = useStore()
  const [intensity, setIntensity] = useState<Intensity>('moderate')
  const weight = state.profile?.weightKg ?? 75
  const done = active.exercises.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0)
  const dur = Math.max(60, Math.round(durationSec))

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
            <p className="label mb-2">Intensidad percibida</p>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(INTENSITY_LABELS) as Intensity[]).map((k) => (
                <button
                  key={k}
                  onClick={() => setIntensity(k)}
                  className={cn(
                    'rounded-2xl border py-3 text-center transition active:scale-95',
                    intensity === k ? 'border-neon/60 bg-neon/15 text-white' : 'border-line bg-white/[0.03] text-white/55',
                  )}
                >
                  <div className="text-[14px] font-bold">{INTENSITY_LABELS[k]}</div>
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
                  {GYM_MET[intensity]} MET × {weight} kg × {(dur / 3600).toFixed(2)} h
                </div>
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
