import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Check, ChevronDown, Dumbbell, Flame, Pencil, Play, Plus, Trash2, Trophy } from 'lucide-react'
import { PageHeader } from '../components/bits'
import { Sheet } from '../components/Sheet'
import { RoutineEditor } from '../features/RoutineEditor'
import { useStore } from '../lib/store'
import { useUI } from '../lib/ui'
import { GROUPS, allExercises, exerciseById, groupOf, isWeekRoutine } from '../lib/exercises'
import type { Group } from '../lib/exercises'
import { bestE1rm, buildActive, exerciseHistory, exerciseKcalShare, muscleLoad, newExercise } from '../lib/workout'
import { MuscleMap } from '../components/MuscleMap'
import { MagicBar } from '../features/MagicBar'
import { WeekPlan } from '../features/WeekPlan'
import type { Routine, SetLog } from '../lib/types'
import { fmt, fmtClock, haptic, keyToDate, todayKey } from '../lib/utils'

function RoutineCard({ r, onEdit }: { r: Routine; onEdit: () => void }) {
  const { state, setActive, removeRoutine } = useStore()
  const muscles = [...new Set(r.exercises.map((e) => exerciseById(e.exerciseId)?.muscle).filter(Boolean))] as string[]
  const sets = r.exercises.reduce((n, e) => n + e.sets, 0)
  const [confirm, setConfirm] = useState(false)

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-[17px] font-extrabold leading-tight">{r.name}</h3>
          <p className="num mt-0.5 text-[12px] text-white/45">
            {r.exercises.length} ejercicios · {sets} series
          </p>
        </div>
        <div className="flex shrink-0 gap-1">
          <button aria-label="Editar" className="grid h-9 w-9 place-items-center rounded-xl text-white/40 active:bg-white/10" onClick={onEdit}>
            <Pencil size={16} />
          </button>
          <button
            aria-label="Eliminar"
            className={`grid h-9 place-items-center rounded-xl px-2 text-[12px] font-bold ${confirm ? 'bg-fire/20 text-fire' : 'w-9 text-white/40 active:text-fire'}`}
            onClick={() => (confirm ? removeRoutine(r.id) : (setConfirm(true), window.setTimeout(() => setConfirm(false), 2500)))}
          >
            {confirm ? '¿Seguro?' : <Trash2 size={16} />}
          </button>
        </div>
      </div>
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {muscles.slice(0, 5).map((m) => (
          <span key={m} className="rounded-full bg-neon/12 px-2.5 py-1 text-[11px] font-semibold text-neon">
            {m}
          </span>
        ))}
      </div>
      <button
        className="btn-violet mt-4 w-full !py-2.5"
        onClick={() => {
          haptic(20)
          setActive(buildActive(r, state.sessions))
        }}
      >
        <Play size={16} fill="currentColor" /> Empezar
      </button>
    </div>
  )
}

const GROUP_HINT: Record<Group, string> = {
  Pecho: 'Pectoral mayor y menor',
  Espalda: 'Dorsales, trapecio y lumbar',
  Hombros: 'Deltoides y trapecio',
  Bíceps: 'Flexores del codo',
  Tríceps: 'Extensores del codo',
  Pierna: 'Cuádriceps, isquios, glúteos y gemelos',
  Abdomen: 'Core y oblicuos',
}

const daysAgo = (date: string): string => {
  const d = Math.round((keyToDate(todayKey()).getTime() - keyToDate(date).getTime()) / 86400000)
  return d <= 0 ? 'hoy' : d === 1 ? 'ayer' : `hace ${d} días`
}

/** "80kg × 8" chips for the sets of one session */
function SetChips({ sets }: { sets: SetLog[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {sets.slice(0, 8).map((s, i) => (
        <span key={i} className={`num rounded-lg px-2 py-1 text-[12px] font-bold ${s.pr ? 'bg-neon text-white' : 'bg-white/[0.06] text-white/80'}`}>
          {s.kg > 0 ? `${s.kg}kg` : 'PC'} × {s.reps}
        </span>
      ))}
      {sets.length > 8 && <span className="num px-1 py-1 text-[12px] text-white/40">+{sets.length - 8}</span>}
    </div>
  )
}

export function Gym() {
  const { state, setActive, removeSession } = useStore()
  const [editing, setEditing] = useState<Routine | 'new' | null>(null)
  const [group, setGroup] = useState<Group>('Pecho')
  const [open, setOpen] = useState<string | null>(null)
  const [justAdded, setJustAdded] = useState<string | null>(null)
  /** the muscle library / extra routines / recovery map stay folded: the Gym tab is your Mon–Fri plan */
  const [more, setMore] = useState(false)
  /** routines you created yourself (the Mon–Fri plan has its own panel) */
  const others = state.routines.filter((r) => !isWeekRoutine(r))
  const [now] = useState(() => Date.now())

  // every exercise of the muscle group (catalog + your own) with its history
  const rows = useMemo(() => {
    const list = allExercises()
      .filter((e) => groupOf(e.muscle) === group)
      .map((e) => ({ e, hist: exerciseHistory(state.sessions, e.id) }))
    return list.sort((a, b) => {
      const ta = a.hist[0]?.session.startedAt ?? 0
      const tb = b.hist[0]?.session.startedAt ?? 0
      return tb - ta || a.e.name.localeCompare(b.e.name)
    })
  }, [group, state.sessions, state.custom])

  const stats = useMemo(() => {
    const since7 = now - 7 * 86400000
    const since30 = now - 30 * 86400000
    let sets7 = 0
    let volume30 = 0
    let kcal30 = 0
    for (const s of state.sessions) {
      if (s.startedAt < since30) continue
      for (const e of s.exercises) {
        const def = exerciseById(e.exerciseId)
        if (!def || groupOf(def.muscle) !== group) continue
        const done = e.sets.filter((x) => x.done)
        if (s.startedAt >= since7) sets7 += done.length
        volume30 += done.reduce((a, x) => a + x.kg * x.reps, 0)
        kcal30 += exerciseKcalShare(s, e.exerciseId) * (done.length / Math.max(1, s.exercises.filter((x) => x.exerciseId === e.exerciseId).reduce((n, x) => n + x.sets.filter((y) => y.done).length, 0)))
      }
    }
    return { sets7, volume30: Math.round(volume30), kcal30: Math.round(kcal30) }
  }, [state.sessions, group, now])

  const counts7 = useMemo(() => {
    const since7 = now - 7 * 86400000
    const out = {} as Record<Group, number>
    for (const g of GROUPS) out[g] = 0
    for (const s of state.sessions) {
      if (s.startedAt < since7) continue
      for (const e of s.exercises) {
        const def = exerciseById(e.exerciseId)
        if (def) out[groupOf(def.muscle)] += e.sets.filter((x) => x.done).length
      }
    }
    return out
  }, [state.sessions, now])

  const load = useMemo(() => muscleLoad(state.sessions, state.active), [state.sessions, state.active])
  const history = [...state.sessions].sort((a, b) => b.startedAt - a.startedAt).slice(0, 12)

  /** One tap: adds the exercise (with ghost sets from the last time) to the running workout, or starts one. */
  const addToWorkout = (id: string) => {
    haptic(15)
    const ex = newExercise(state.sessions, id)
    if (state.active) setActive({ ...state.active, exercises: [...state.active.exercises, ex] })
    else setActive({ ...buildActive(null, state.sessions), exercises: [ex] })
    setJustAdded(id)
    window.setTimeout(() => setJustAdded(null), 1200)
  }

  return (
    <div className="px-4 pb-8 lg:px-0">
      <PageHeader
        title="Gimnasio"
        sub="Tu semana de lunes a viernes"
        right={
          <button
            className="btn-ghost !rounded-2xl !px-3.5 !py-2.5 text-[13px]"
            onClick={() => {
              haptic(15)
              setActive(buildActive(null, state.sessions))
            }}
          >
            <Dumbbell size={16} /> Sesión libre
          </button>
        }
      />

      <div className="space-y-4 lg:grid lg:grid-cols-12 lg:items-start lg:gap-5 lg:space-y-0">
        <MagicBar className="lg:col-span-12" />

        <WeekPlan className="lg:col-span-12" onEdit={setEditing} />

        <button
          type="button"
          aria-expanded={more}
          onClick={() => setMore((m) => !m)}
          className="flex w-full items-center justify-between rounded-2xl border border-line bg-white/[0.03] px-4 py-3.5 text-left text-[13.5px] font-bold text-white/70 lg:col-span-12"
        >
          <span>Biblioteca de ejercicios, recuperación y más</span>
          <ChevronDown size={18} className={`transition-transform ${more ? 'rotate-180' : ''}`} />
        </button>

        {more && (
          <>
        {/* ---- muscles → all their exercises ---- */}
        <div className="space-y-4 lg:col-span-7">
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0" role="tablist" aria-label="Grupos musculares">
            {GROUPS.map((g) => (
              <button
                key={g}
                role="tab"
                aria-selected={group === g}
                onClick={() => {
                  haptic(6)
                  setGroup(g)
                  setOpen(null)
                }}
                className={`chip !px-4 !py-2.5 ${group === g ? 'border-neon/60 bg-neon/15 !text-violet-200' : ''}`}
              >
                {g}
                {counts7[g] > 0 && <span className="num rounded-full bg-white/10 px-1.5 text-[10px] text-white/60">{counts7[g]}</span>}
              </button>
            ))}
          </div>

          <section className="card p-5">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-[20px] font-extrabold tracking-tight">{group}</h2>
              <span className="text-[12px] text-white/45">{GROUP_HINT[group]}</span>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2.5">
              {[
                { l: 'Series 7 días', v: stats.sets7, c: 'text-white' },
                { l: 'Volumen 30 d (kg)', v: fmt(stats.volume30), c: 'text-neon' },
                { l: 'kcal 30 días', v: fmt(stats.kcal30), c: 'text-fire' },
              ].map((s) => (
                <div key={s.l} className="card-raised px-2.5 py-3 text-center">
                  <div className={`num text-[20px] font-bold leading-none ${s.c}`}>{s.v}</div>
                  <div className="mt-1.5 text-[10px] font-bold uppercase tracking-wide text-white/40">{s.l}</div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="label mb-2 px-1">
              {rows.length} ejercicios · toca uno para ver tu historial, <span className="text-neon">+</span> para añadirlo al entreno
            </h3>
            <ul className="space-y-2.5">
              {rows.map(({ e, hist }) => {
                const last = hist[0]
                const best = bestE1rm(state.sessions, e.id)
                const isOpen = open === e.id
                return (
                  <li key={e.id} className="card-raised overflow-hidden">
                    <div className="flex items-stretch">
                      <button onClick={() => setOpen(isOpen ? null : e.id)} aria-expanded={isOpen} className="min-w-0 flex-1 p-3.5 text-left">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-[15px] font-bold">{e.name}</span>
                          {e.custom && <span className="rounded bg-neon/20 px-1 text-[10px] font-bold text-violet-200">PROPIO</span>}
                        </div>
                        <div className="text-[12px] text-white/45">
                          {e.muscle} · {e.equipment}
                        </div>
                        {last ? (
                          <div className="mt-2.5 space-y-2">
                            <SetChips sets={last.sets} />
                            <div className="num flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11.5px] text-white/45">
                              <span>{daysAgo(last.session.date)}</span>
                              {best !== null && (
                                <span>
                                  1RM est. <b className="text-violet-300">{Math.round(best)} kg</b>
                                </span>
                              )}
                              <span className="flex items-center gap-0.5 text-fire">
                                <Flame size={11} />≈ {fmt(last.kcal)} kcal
                              </span>
                              <span>{hist.length} {hist.length === 1 ? 'sesión' : 'sesiones'}</span>
                            </div>
                          </div>
                        ) : (
                          <p className="mt-2 text-[12px] text-white/35">Aún sin registros: tu peso y repeticiones aparecerán aquí.</p>
                        )}
                      </button>
                      <button
                        onClick={() => addToWorkout(e.id)}
                        aria-label={`Añadir ${e.name} al entreno`}
                        className={`m-3 grid h-11 w-11 shrink-0 place-items-center self-center rounded-2xl transition active:scale-90 ${justAdded === e.id ? 'bg-emerald text-[#04130d]' : 'bg-neon text-white shadow-[0_6px_20px_-6px_rgba(139,92,246,0.8)]'}`}
                      >
                        {justAdded === e.id ? <Check size={20} strokeWidth={3} /> : <Plus size={22} strokeWidth={3} />}
                      </button>
                    </div>

                    {isOpen && (
                      <div className="border-t border-line bg-black/20 px-3.5 py-3">
                        {hist.length === 0 ? (
                          <p className="text-[12.5px] text-white/45">Cuando lo hagas, aquí verás cada sesión con sus pesos y repeticiones y las calorías que te ha costado.</p>
                        ) : (
                          <ul className="space-y-3">
                            {hist.slice(0, 6).map((h) => (
                              <li key={h.session.id}>
                                <div className="num mb-1.5 flex items-center justify-between text-[11.5px] text-white/45">
                                  <span>
                                    {keyToDate(h.session.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} · {h.session.routineName}
                                  </span>
                                  <span className="flex items-center gap-0.5 text-fire">
                                    <Flame size={11} />≈ {fmt(h.kcal)} kcal
                                  </span>
                                </div>
                                <SetChips sets={h.sets} />
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          </section>
        </div>

        {/* ---- your routines (none by default) + recovery map ---- */}
        <div className="space-y-4 lg:sticky lg:top-6 lg:col-span-5">
          <section className="card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="label">Mis rutinas</h2>
              <button className="btn-ghost !rounded-xl !px-3 !py-2 text-[13px]" onClick={() => setEditing('new')}>
                <Plus size={15} /> Nueva rutina
              </button>
            </div>
            {others.length === 0 ? (
              <p className="rounded-2xl bg-white/[0.03] px-4 py-5 text-center text-[13px] leading-snug text-white/45">
                Aquí van tus otras rutinas. Elige ejercicios de cada músculo y arma las que quieras, o entrena en sesión libre.
              </p>
            ) : (
              <div className="space-y-3">
                {others.map((r) => (
                  <RoutineCard key={r.id} r={r} onEdit={() => setEditing(r)} />
                ))}
              </div>
            )}
          </section>

          <section className="card p-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="label">Recuperación · 48 h</p>
              <span className="flex items-center gap-2 text-[10px] font-semibold text-white/40">
                <span className="h-2 w-2 rounded-full bg-neon" /> trabajado
                <span className="h-2 w-2 rounded-full bg-emerald/60" /> fresco
              </span>
            </div>
            <MuscleMap load={load} now={now} />
          </section>
        </div>
          </>
        )}

        {history.length > 0 && (
          <section className="lg:col-span-12">
            <h2 className="label mb-2 px-1">Historial</h2>
            <div className="card divide-y divide-line">
              {history.map((s, i) => (
                <motion.div key={s.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} className="flex items-center gap-3 p-4">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-neon/12 text-neon">
                    <Dumbbell size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14px] font-bold">{s.routineName}</div>
                    <div className="num text-[12px] text-white/45">
                      {keyToDate(s.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} · {fmtClock(s.durationSec)} · {fmt(s.volume)} kg
                    </div>
                  </div>
                  {s.prCount > 0 && (
                    <span className="num inline-flex items-center gap-1 rounded-lg bg-neon px-2 py-1 text-[11px] font-extrabold text-white">
                      <Trophy size={11} /> {s.prCount}
                    </span>
                  )}
                  <div className="num flex items-center gap-0.5 text-[14px] font-bold text-fire">
                    <Flame size={13} />
                    {fmt(s.kcal)}
                  </div>
                  <button aria-label="Eliminar sesión" className="grid h-8 w-8 place-items-center rounded-lg text-white/25 active:text-fire" onClick={() => removeSession(s.id)}>
                    <Trash2 size={15} />
                  </button>
                </motion.div>
              ))}
            </div>
          </section>
        )}
      </div>

      <RoutineEditor target={editing} onClose={() => setEditing(null)} />
    </div>
  )
}

/** Routine picker opened from the central + button */
export function StartSheet() {
  const { sheet, close } = useUI()
  const { state, setActive } = useStore()
  const open = sheet?.name === 'start'
  return (
    <Sheet open={open} onClose={close} title="Empezar entreno">
      <div className="space-y-2.5">
        <button
          className="flex w-full items-center gap-3 rounded-2xl border border-dashed border-line p-4 text-left active:scale-[0.98]"
          onClick={() => {
            setActive(buildActive(null, state.sessions))
            close()
          }}
        >
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-white/[0.06]">
            <Dumbbell size={20} />
          </div>
          <div>
            <div className="font-bold">Entreno libre</div>
            <div className="text-[12px] text-white/45">Añade ejercicios sobre la marcha</div>
          </div>
        </button>
        {state.routines.map((r) => (
          <button
            key={r.id}
            className="flex w-full items-center gap-3 rounded-2xl border border-line bg-card p-4 text-left active:scale-[0.98]"
            onClick={() => {
              haptic(20)
              setActive(buildActive(r, state.sessions))
              close()
            }}
          >
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-neon text-white">
              <Play size={18} fill="currentColor" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate font-bold">{r.name}</div>
              <div className="truncate text-[12px] text-white/45">
                {r.program} · {r.exercises.length} ejercicios
              </div>
            </div>
          </button>
        ))}
      </div>
    </Sheet>
  )
}

export function SummarySheet() {
  const { summary, setSummary } = useUI()
  const close = () => setSummary(null)
  return (
    <Sheet open={!!summary} onClose={close} title="¡Entreno completado!" z={90}>
      {summary && (
        <div className="space-y-4">
          <div className="text-center">
            <motion.div
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 14 }}
              className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-neon text-white shadow-[0_12px_40px_-8px_rgba(139,92,246,0.9)]"
            >
              <Dumbbell size={36} />
            </motion.div>
            <p className="mt-3 text-lg font-extrabold">{summary.routineName}</p>
          </div>
          <div className="num grid grid-cols-4 gap-2 text-center">
            {[
              { l: 'tiempo', v: fmtClock(summary.durationSec), c: 'text-white' },
              { l: 'series', v: summary.sets, c: 'text-white' },
              { l: 'kg vol.', v: fmt(summary.volume), c: 'text-neon' },
              { l: 'kcal', v: fmt(summary.kcal), c: 'text-fire' },
            ].map((x) => (
              <div key={x.l} className="card-raised py-3">
                <div className={`text-[17px] font-bold ${x.c}`}>{x.v}</div>
                <div className="text-[10px] font-semibold text-white/40">{x.l}</div>
              </div>
            ))}
          </div>
          {summary.prs.length > 0 && (
            <div className="rounded-2xl bg-gradient-to-br from-neon/25 to-neon/5 p-4">
              <div className="mb-2 flex items-center gap-2 font-extrabold text-violet-300">
                <Trophy size={18} /> {summary.prs.length} récord{summary.prs.length > 1 ? 's' : ''} personal{summary.prs.length > 1 ? 'es' : ''}
              </div>
              <ul className="space-y-1 text-[13px] text-white/75">
                {summary.prs.map((p, i) => (
                  <li key={i}>
                    {p.exercise} <span className="num text-violet-300">· 1RM est. {p.e1rm} kg</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="text-center text-[12px] text-white/40">Las kcal ya se han sumado a tu balance de hoy.</p>
          <button className="btn-primary w-full" onClick={close}>
            Listo
          </button>
        </div>
      )}
    </Sheet>
  )
}
