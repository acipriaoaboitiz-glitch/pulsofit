import { motion } from 'framer-motion'
import { Check, Flame, History, Play, Timer } from 'lucide-react'
import { useStore } from '../lib/store'
import { useWeekDay } from './WeekPlan'
import { cn, fmt, fmtClock, keyToDate } from '../lib/utils'

const REST = [60, 90, 120, 180]

/** Sticky side panel of the Gym tab (desktop): the day's plan at a glance, last session and a one-tap start. */
export function SessionPanel({ day, className }: { day: number; className?: string }) {
  const { state } = useStore()
  const { plan, routine, rows, totalSets, totalKcal, done, start } = useWeekDay(day)
  const last = [...state.sessions].sort((a, b) => b.startedAt - a.startedAt)[0]
  const empty = rows.length === 0

  return (
    <aside className={cn('card relative overflow-hidden p-5 lg:p-6', className)} aria-label="Panel de sesión">
      <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-neon/[0.14] blur-3xl" />
      <div className="relative flex items-center justify-between">
        <p className="label !text-neon">Sesión</p>
        {done ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald/15 px-2.5 py-1 text-[11px] font-bold text-emerald">
            <Check size={12} strokeWidth={3} /> Hecho hoy
          </span>
        ) : (
          <span className="text-[11px] font-semibold text-white/35">sin sesión activa</span>
        )}
      </div>

      <div className="relative mt-4">
        <div className="num text-[44px] font-bold leading-none tracking-tight text-white/25">00:00:00</div>
        <p className="mt-2 text-[13px] text-white/50">
          {plan.name} · {plan.focus}
        </p>
      </div>

      <div className="relative mt-5 grid grid-cols-3 gap-2.5">
        {[
          { l: 'Ejercicios', v: rows.length, c: 'text-white' },
          { l: 'Series', v: totalSets, c: 'text-white' },
          { l: 'kcal ≈', v: totalKcal, c: 'text-fire' },
        ].map((x) => (
          <div key={x.l} className="card-raised px-2 py-3 text-center">
            <div className={cn('num text-[22px] font-bold leading-none', x.c)}>{x.l === 'kcal ≈' ? <span className="inline-flex items-center gap-0.5"><Flame size={14} />{fmt(x.v)}</span> : x.v}</div>
            <div className="label mt-1.5 !text-[9px]">{x.l}</div>
          </div>
        ))}
      </div>

      <div className="relative mt-5">
        <p className="label mb-2 flex items-center gap-1.5">
          <Timer size={12} /> Descanso entre series
        </p>
        <div className="flex gap-1.5">
          {REST.map((s) => (
            <span key={s} className={cn('num flex-1 rounded-xl border py-2 text-center text-[12px] font-bold', s === 90 ? 'border-neon/40 bg-neon/15 text-violet-200' : 'border-white/[0.07] bg-white/[0.03] text-white/45')}>
              {fmtClock(s)}
            </span>
          ))}
        </div>
        <p className="mt-2 text-[11.5px] leading-snug text-white/35">El temporizador arranca solo al marcar cada serie.</p>
      </div>

      <motion.button
        whileTap={{ scale: 0.96 }}
        disabled={empty || !routine}
        className="btn-violet relative mt-5 w-full !py-3.5 text-[15px]"
        onClick={() => {
          navigator.vibrate?.(15)
          start()
        }}
      >
        <Play size={16} fill="currentColor" /> {done ? 'Repetir' : 'Empezar'} {plan.name.toLowerCase()}
      </motion.button>

      {last && (
        <div className="relative mt-5 rounded-2xl border border-white/[0.06] bg-white/[0.025] p-3.5">
          <p className="label mb-1.5 flex items-center gap-1.5">
            <History size={12} /> Última sesión
          </p>
          <p className="truncate text-[14px] font-bold">{last.routineName}</p>
          <p className="num mt-0.5 flex flex-wrap items-center gap-x-3 text-[11.5px] text-white/45">
            <span>{keyToDate(last.date).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
            <span>{fmtClock(last.durationSec)}</span>
            <span className="flex items-center gap-0.5 text-fire">
              <Flame size={11} />
              {fmt(last.kcal)}
            </span>
          </p>
        </div>
      )}
    </aside>
  )
}
