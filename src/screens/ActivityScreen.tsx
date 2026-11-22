import { useMemo, useState } from 'react'
import { Activity as ActivityIcon, Bike, Check, Flame, Footprints, Trash2, Trophy, Waves, Zap } from 'lucide-react'
import type { ComponentType } from 'react'
import { PageHeader, Stepper } from '../components/bits'
import { Ring } from '../components/Ring'
import { useStore } from '../lib/store'
import { CARDIO, cardioById, cardioKcal, stepsKcal, stepsToKm } from '../lib/activities'
import type { CardioDef } from '../lib/activities'
import type { CardioKind } from '../lib/types'
import { addDays, cn, fmt, haptic, todayKey } from '../lib/utils'

const Walk = ({ size }: { size?: number }) => <Footprints size={size} />
const ICONS: Record<CardioDef['icon'], ComponentType<{ size?: number }>> = {
  walk: Walk,
  footprints: Footprints,
  run: ActivityIcon,
  zap: Zap,
  bike: Bike,
  activity: ActivityIcon,
  waves: Waves,
  trophy: Trophy,
}

const STEP_GOAL = 10000

export function ActivityScreen() {
  const { state, totals, addSteps, setStepsTotal, addCardio, removeActivity } = useStore()
  const p = state.profile
  const date = todayKey()
  const t = totals(date)
  const [exact, setExact] = useState('')
  const [kind, setKind] = useState<CardioKind>('walk_fast')
  const [minutes, setMinutes] = useState(30)
  const [flash, setFlash] = useState(false)

  const week = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = addDays(date, i - 6)
        const x = totals(d)
        return { d, burned: x.burned, steps: x.steps }
      }),
    // totals depends on the underlying logs
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [totals, date],
  )
  const maxBurn = Math.max(300, ...week.map((w) => w.burned))

  if (!p) return null

  const exactN = parseInt(exact, 10)
  const exactOk = Number.isFinite(exactN) && exactN > 0

  const addQuick = (n: number) => {
    haptic(14)
    addSteps(n)
  }

  const kcalPreview = cardioKcal(kind, p.weightKg, minutes)
  const todays = state.activity.filter((a) => a.date === date).sort((a, b) => b.u - a.u)

  return (
    <div className="px-4 pb-8">
      <PageHeader title="Actividad" sub="Pasos y cardio" />

      <div className="space-y-4">
        {/* Steps */}
        <section className="card p-5">
          <div className="flex items-center gap-5">
            <Ring size={128} stroke={12} value={t.steps / STEP_GOAL} color="#F59E0B">
              <Footprints size={20} className="mb-0.5 text-fire" />
              <span className="num text-[22px] font-bold leading-none">{fmt(t.steps)}</span>
              <span className="num text-[10px] text-white/40">/ {fmt(STEP_GOAL)}</span>
            </Ring>
            <div className="flex-1 space-y-3">
              <div>
                <div className="num text-[26px] font-bold leading-none">
                  {t.km.toFixed(2)}
                  <span className="ml-1 text-sm text-white/40">km</span>
                </div>
                <div className="text-[11px] text-white/40">según tu altura ({p.heightCm} cm)</div>
              </div>
              <div>
                <div className="num flex items-center gap-1 text-[26px] font-bold leading-none text-fire">
                  <Flame size={18} />
                  {fmt(t.stepsKcal)}
                  <span className="text-sm text-white/40">kcal</span>
                </div>
                <div className="text-[11px] text-white/40">según tu peso ({p.weightKg} kg)</div>
              </div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2">
            {[1000, 2500, 5000].map((n) => (
              <button key={n} onClick={() => addQuick(n)} className="num rounded-2xl bg-fire/12 py-3 text-[14px] font-bold text-fire active:scale-95">
                +{fmt(n)}
              </button>
            ))}
          </div>

          <div className="mt-3 flex gap-2">
            <input
              className="input num"
              inputMode="numeric"
              placeholder="Cifra exacta (ej. 7342)"
              value={exact}
              onChange={(e) => setExact(e.target.value.replace(/\D/g, '').slice(0, 6))}
            />
            <button
              className="btn-ghost !px-3.5 text-[13px]"
              disabled={!exactOk}
              onClick={() => {
                addQuick(exactN)
                setExact('')
              }}
            >
              Sumar
            </button>
            <button
              className="btn-primary !px-3.5 text-[13px]"
              disabled={!exactOk}
              onClick={() => {
                haptic(14)
                setStepsTotal(exactN)
                setExact('')
              }}
              title="Sustituye el total de hoy por esta cifra"
            >
              Fijar total
            </button>
          </div>
          <p className="mt-2 text-[11px] text-white/35">
            "Sumar" añade pasos al contador; "Fijar total" sustituye lo de hoy (útil para copiar la cifra de tu móvil o reloj).
          </p>
        </section>

        {/* Cardio */}
        <section className="card p-5">
          <p className="label mb-3">Calculadora de cardio</p>
          <div className="grid grid-cols-4 gap-2">
            {CARDIO.map((c) => {
              const Icon = ICONS[c.icon]
              const on = kind === c.id
              return (
                <button
                  key={c.id}
                  onClick={() => {
                    haptic(6)
                    setKind(c.id)
                  }}
                  className={cn(
                    'flex flex-col items-center gap-1.5 rounded-2xl border px-1 py-3 transition active:scale-95',
                    on ? 'border-fire/60 bg-fire/12 text-fire' : 'border-line bg-white/[0.03] text-white/60',
                  )}
                >
                  <Icon size={22} />
                  <span className="text-center text-[10px] font-bold leading-tight">{c.name}</span>
                </button>
              )
            })}
          </div>

          <div className="mt-5 flex items-center justify-between">
            <span className="text-[13px] font-bold text-white/60">Duración</span>
            <Stepper value={minutes} onChange={setMinutes} step={5} min={5} max={300} unit="min" />
          </div>
          <input
            type="range"
            min={5}
            max={180}
            step={5}
            value={Math.min(minutes, 180)}
            onChange={(e) => setMinutes(Number(e.target.value))}
            className="mt-3 w-full accent-[#F59E0B]"
            aria-label="Minutos"
          />

          <div className="mt-4 flex items-center justify-between rounded-2xl border border-fire/25 bg-fire/[0.07] p-4">
            <div>
              <div className="label !text-fire/80">Quemarás</div>
              <div className="num text-[11px] text-white/40">
                MET {cardioById(kind).met} × {p.weightKg} kg × {(minutes / 60).toFixed(2)} h
              </div>
            </div>
            <div className="num flex items-baseline gap-1 text-[34px] font-bold text-fire">
              {fmt(kcalPreview)}
              <span className="text-sm text-white/40">kcal</span>
            </div>
          </div>

          <button
            className="btn-primary mt-4 w-full"
            onClick={() => {
              haptic([14, 30, 14])
              addCardio({ date, cardio: kind, minutes, kcal: kcalPreview })
              setFlash(true)
              window.setTimeout(() => setFlash(false), 1200)
            }}
          >
            {flash ? (
              <>
                <Check size={20} strokeWidth={3} /> Registrado
              </>
            ) : (
              'Registrar cardio'
            )}
          </button>
        </section>

        {/* Week */}
        <section className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <p className="label">Calorías quemadas · 7 días</p>
            <span className="num text-[12px] text-white/40">
              {fmt(week.reduce((a, w) => a + w.burned, 0))} kcal
            </span>
          </div>
          <div className="flex h-28 items-end gap-2">
            {week.map((w) => {
              const h = (w.burned / maxBurn) * 100
              const isToday = w.d === date
              return (
                <div key={w.d} className="flex flex-1 flex-col items-center gap-1.5">
                  <span className="num text-[9px] text-white/35">{w.burned > 0 ? fmt(w.burned) : ''}</span>
                  <div className="flex w-full flex-1 items-end">
                    <div
                      className={cn('w-full rounded-lg transition-all', isToday ? 'bg-fire' : 'bg-fire/35')}
                      style={{ height: `${Math.max(4, h)}%` }}
                    />
                  </div>
                  <span className={cn('text-[10px] font-bold', isToday ? 'text-white' : 'text-white/35')}>
                    {new Date(w.d + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'narrow' })}
                  </span>
                </div>
              )
            })}
          </div>
        </section>

        {/* Today's log */}
        {todays.length > 0 && (
          <section className="card p-5">
            <p className="label mb-2">Registro de hoy</p>
            <ul className="divide-y divide-line">
              {todays.map((a) => (
                <li key={a.id} className="flex items-center gap-3 py-2.5">
                  <div className="grid h-9 w-9 place-items-center rounded-xl bg-fire/12 text-fire">
                    {a.type === 'steps' ? <Footprints size={17} /> : <ActivityIcon size={17} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[14px] font-bold">
                      {a.type === 'steps' ? `${fmt(a.steps ?? 0)} pasos` : cardioById(a.cardio!).name}
                    </div>
                    <div className="num text-[12px] text-white/40">
                      {a.type === 'steps' && p
                        ? `${stepsToKm(a.steps ?? 0, p.heightCm).toFixed(2)} km`
                        : `${a.minutes} min`}
                    </div>
                  </div>
                  <div className="num text-[14px] font-bold text-fire">
                    {fmt(a.type === 'steps' && p ? stepsKcal(a.steps ?? 0, p.weightKg, p.heightCm) : a.kcal)}
                    <span className="ml-0.5 text-[10px] text-white/35">kcal</span>
                  </div>
                  <button
                    aria-label="Eliminar"
                    className="grid h-9 w-9 place-items-center rounded-xl text-white/30 active:text-fire"
                    onClick={() => {
                      haptic(10)
                      removeActivity(a.id)
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  )
}
