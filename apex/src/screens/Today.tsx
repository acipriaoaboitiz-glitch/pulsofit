import { motion } from 'framer-motion'
import { ChevronRight, Dumbbell, Flame, Footprints, Play, UserRound } from 'lucide-react'
import { useStore } from '../lib/store'
import { useUI } from '../lib/ui'
import { useAuth } from '../lib/auth'
import { fmt, fmtClock, greeting, haptic, todayKey } from '../lib/utils'
import { buildActive } from '../lib/workout'
import { Ring } from '../components/Ring'
import { MacroBar } from '../components/bits'
import { WaterWidget } from '../components/WaterWidget'
import { WeightCard } from '../components/WeightCard'
import { MagicBar } from '../features/MagicBar'

const BURN_GOAL = 500

export function Today() {
  const { state, targets, totals, streak, setActive } = useStore()
  const ui = useUI()
  const auth = useAuth()
  if (!targets || !state.profile) return null

  const date = todayKey()
  const t = totals(date)
  const budget = targets.kcal + t.burned
  const remaining = budget - t.consumed
  const over = remaining < 0

  // Next routine in the rotation after the last finished session
  const last = [...state.sessions].sort((a, b) => b.startedAt - a.startedAt)[0]
  const lastIdx = last ? state.routines.findIndex((r) => r.name === last.routineName) : -1
  const next = state.routines.length ? state.routines[(lastIdx + 1) % state.routines.length] : null
  const todaySessions = state.sessions.filter((s) => s.date === date)

  const startNext = () => {
    haptic(20)
    if (next) setActive(buildActive(next, state.sessions))
    else ui.open('start')
  }

  return (
    <div className="space-y-4 px-4 pb-8 lg:grid lg:grid-cols-12 lg:gap-5 lg:space-y-0 lg:px-0">
      <header className="flex items-center justify-between px-1 pb-1 pt-[calc(18px+var(--safe-top))] lg:col-span-12 lg:pt-8">
        <div>
          <p className="label">{new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          <h1 className="mt-1 text-[28px] font-extrabold leading-none tracking-tight">{greeting()} 👋</h1>
        </div>
        <button
          onClick={() => ui.open(auth.session ? 'profile' : 'account')}
          className="grid h-11 w-11 place-items-center rounded-full border border-line bg-card active:scale-90"
          aria-label="Perfil y cuenta"
        >
          <UserRound size={20} className={auth.session ? 'text-emerald' : 'text-white/70'} />
        </button>
      </header>

      <MagicBar className="lg:col-span-12" />

      {/* Hero energy balance */}
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        className="card relative overflow-hidden p-5 lg:col-span-5 lg:row-span-2"
      >
        <div className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-emerald/10 blur-3xl" />
        <div className="flex items-center justify-between">
          <p className="label">Balance energético</p>
          <p className="num text-[11px] text-white/40">Objetivo {fmt(targets.kcal)} kcal</p>
        </div>

        <div className="my-4 flex justify-center">
          <Ring size={216} stroke={16} value={t.consumed / budget} color={over ? '#F97316' : '#10B981'}>
            <Ring size={166} stroke={11} value={t.burned / BURN_GOAL} color="#F97316">
              <div className="text-center">
                <div className={`num text-[40px] font-bold leading-none ${over ? 'text-fire' : 'text-white'}`}>
                  {fmt(Math.abs(remaining))}
                </div>
                <div className="mt-1 text-[11px] font-bold uppercase tracking-wider text-white/45">
                  {over ? 'kcal de más' : 'kcal restantes'}
                </div>
              </div>
            </Ring>
          </Ring>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="num text-xl font-bold text-emerald">{fmt(t.consumed)}</div>
            <div className="text-[11px] font-semibold text-white/45">Consumidas</div>
          </div>
          <div className="border-x border-line">
            <div className="num flex items-center justify-center gap-1 text-xl font-bold text-fire">
              <Flame size={15} />
              {fmt(t.burned)}
            </div>
            <div className="text-[11px] font-semibold text-white/45">Quemadas</div>
          </div>
          <div>
            <div className="num text-xl font-bold">{fmt(Math.max(0, remaining))}</div>
            <div className="text-[11px] font-semibold text-white/45">Restantes</div>
          </div>
        </div>
        {t.burned > 0 && (
          <p className="num mt-3 text-center text-[11px] text-white/35">
            pasos {fmt(t.stepsKcal)} · cardio {fmt(t.cardioKcal)} · pesas {fmt(t.gymKcal)} kcal
          </p>
        )}
      </motion.section>

      {/* Macros */}
      <section className="card space-y-4 p-5 lg:col-span-7">
        <p className="label">Macronutrientes</p>
        <MacroBar label="Proteínas" value={t.protein} target={targets.protein} color="#10B981" />
        <MacroBar label="Carbohidratos" value={t.carbs} target={targets.carbs} color="#F97316" />
        <MacroBar label="Grasas" value={t.fat} target={targets.fat} color="#8B5CF6" />
      </section>

      <div className="lg:col-span-7"><WaterWidget /></div>

      {/* Day summary */}
      <section className="grid grid-cols-2 gap-3 lg:col-span-4 lg:content-start">
        <div className="card p-4">
          <div className="flex items-center gap-2 text-fire">
            <Flame size={18} />
            <span className="label !text-fire/80">Racha</span>
          </div>
          <div className="num mt-2 text-[34px] font-bold leading-none">
            {streak}
            <span className="ml-1 text-sm font-semibold text-white/40">{streak === 1 ? 'día' : 'días'}</span>
          </div>
          <p className="mt-1 text-[12px] text-white/40">consecutivos registrando</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 text-emerald">
            <Footprints size={18} />
            <span className="label !text-emerald/80">Pasos</span>
          </div>
          <div className="num mt-2 text-[34px] font-bold leading-none">{fmt(t.steps)}</div>
          <p className="num mt-1 text-[12px] text-white/40">{t.km.toFixed(1)} km</p>
        </div>
      </section>

      {/* Today's workout */}
      <section className="card overflow-hidden p-5 lg:col-span-4">
        <div className="flex items-center gap-2 text-neon">
          <Dumbbell size={18} />
          <span className="label !text-neon/90">Entreno de hoy</span>
        </div>
        {todaySessions.length > 0 ? (
          <div className="mt-3 space-y-2">
            {todaySessions.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-2xl bg-neon/10 px-4 py-3">
                <div>
                  <div className="font-bold">{s.routineName}</div>
                  <div className="num text-[12px] text-white/50">
                    {fmtClock(s.durationSec)} · {fmt(s.volume)} kg vol.
                  </div>
                </div>
                <div className="num text-right">
                  <div className="text-lg font-bold text-fire">{fmt(s.kcal)}</div>
                  <div className="text-[11px] text-white/40">kcal</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <button
            onClick={startNext}
            className="mt-3 flex w-full items-center gap-4 rounded-2xl bg-neon/10 p-4 text-left active:scale-[0.98]"
          >
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-neon text-white shadow-[0_8px_24px_-6px_rgba(139,92,246,0.8)]">
              <Play size={20} fill="currentColor" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] text-white/50">Te toca</div>
              <div className="truncate text-lg font-extrabold">{next?.name ?? 'Sesión libre'}</div>
              {next && (
                <div className="truncate text-[12px] text-white/45">
                  {next.program} · {next.exercises.length} ejercicios
                </div>
              )}
            </div>
            <ChevronRight className="text-white/30" />
          </button>
        )}
      </section>

      <div className="lg:col-span-4"><WeightCard /></div>
    </div>
  )
}
