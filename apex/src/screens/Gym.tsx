import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Dumbbell, Flame, Pencil, Play, Plus, Trash2, Trophy } from 'lucide-react'
import { PageHeader, Empty } from '../components/bits'
import { Sheet } from '../components/Sheet'
import { RoutineEditor } from '../features/RoutineEditor'
import { useStore } from '../lib/store'
import { useUI } from '../lib/ui'
import { exerciseById } from '../lib/exercises'
import { buildActive, frequentExercises, muscleLoad, newExercise } from '../lib/workout'
import { MuscleMap } from '../components/MuscleMap'
import { MagicBar } from '../features/MagicBar'
import type { Routine } from '../lib/types'
import { addDays, fmt, fmtClock, haptic, keyToDate, todayKey } from '../lib/utils'

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

export function Gym() {
  const { state, setActive, removeSession } = useStore()
  const [editing, setEditing] = useState<Routine | 'new' | null>(null)

  const programs = useMemo(() => {
    const m = new Map<string, Routine[]>()
    for (const r of state.routines) m.set(r.program, [...(m.get(r.program) ?? []), r])
    return [...m.entries()]
  }, [state.routines])

  const week = useMemo(() => {
    const from = addDays(todayKey(), -6)
    const ss = state.sessions.filter((s) => s.date >= from)
    return {
      n: ss.length,
      volume: ss.reduce((a, s) => a + s.volume, 0),
      prs: ss.reduce((a, s) => a + s.prCount, 0),
    }
  }, [state.sessions])

  const history = [...state.sessions].sort((a, b) => b.startedAt - a.startedAt).slice(0, 12)
  const load = useMemo(() => muscleLoad(state.sessions, state.active), [state.sessions, state.active])
  const frequent = useMemo(() => frequentExercises(state.sessions, 8).filter((id) => exerciseById(id)), [state.sessions])
  const [now] = useState(() => Date.now())

  /** "Lo de siempre": one tap starts (or extends) a workout with that exercise and its ghost sets. */
  const quickAdd = (id: string) => {
    haptic(15)
    const ex = newExercise(state.sessions, id)
    if (state.active) setActive({ ...state.active, exercises: [...state.active.exercises, ex] })
    else setActive({ ...buildActive(null, state.sessions), exercises: [ex] })
  }

  return (
    <div className="px-4 pb-8 lg:px-0">
      <PageHeader
        title="Gimnasio"
        sub="Rutinas ilimitadas · gratis"
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

        {frequent.length > 0 && (
          <section className="lg:col-span-12">
            <h2 className="label mb-2 px-1">Lo de siempre</h2>
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
              {frequent.map((id) => (
                <button key={id} onClick={() => quickAdd(id)} className="chip max-w-[220px] shrink-0 !rounded-2xl !py-2.5 active:!bg-neon/20">
                  <Plus size={13} strokeWidth={3} className="text-neon" />
                  <span className="truncate">{exerciseById(id)?.name}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        <section className="card p-5 lg:sticky lg:top-6 lg:col-span-5 lg:row-span-6 lg:self-start">
          <div className="mb-3 flex items-center justify-between">
            <p className="label">Recuperación muscular · 48 h</p>
            <span className="flex items-center gap-2 text-[10px] font-semibold text-white/40">
              <span className="h-2 w-2 rounded-full bg-neon" /> trabajado
              <span className="h-2 w-2 rounded-full bg-emerald/60" /> fresco
            </span>
          </div>
          <MuscleMap load={load} now={now} />
        </section>

        <section className="grid grid-cols-3 gap-2.5 lg:col-span-7">
          {[
            { l: 'Sesiones 7d', v: week.n, c: 'text-white' },
            { l: 'Volumen kg', v: fmt(week.volume), c: 'text-emerald' },
            { l: 'Récords', v: week.prs, c: 'text-neon' },
          ].map((s) => (
            <div key={s.l} className="card px-3 py-3.5 text-center">
              <div className={`num text-[22px] font-bold leading-none ${s.c}`}>{s.v}</div>
              <div className="mt-1.5 text-[10.5px] font-bold uppercase tracking-wide text-white/40">{s.l}</div>
            </div>
          ))}
        </section>

        {programs.map(([program, list]) => (
          <section key={program} className="lg:col-span-7">
            <h2 className="label mb-2 px-1">{program}</h2>
            <div className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0">
              {list.map((r) => (
                <RoutineCard key={r.id} r={r} onEdit={() => setEditing(r)} />
              ))}
            </div>
          </section>
        ))}

        {state.routines.length === 0 && (
          <Empty icon={<Dumbbell size={24} />} text="No tienes rutinas. Crea la tuya con la biblioteca de +70 ejercicios." />
        )}

        <button className="btn-ghost w-full lg:col-span-7" onClick={() => setEditing('new')}>
          <Plus size={18} /> Nueva rutina
        </button>

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
                      {keyToDate(s.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} · {fmtClock(s.durationSec)} ·{' '}
                      {fmt(s.volume)} kg
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
