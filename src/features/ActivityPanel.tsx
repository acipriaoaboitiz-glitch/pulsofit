import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ComponentType } from 'react'
import { Activity as ActivityIcon, Bike, Check, Flame, Footprints, HeartPulse, RefreshCw, Trash2, Trophy, Waves, Wind } from 'lucide-react'
import { Ring } from '../components/Ring'
import { Stepper } from '../components/bits'
import { useStore } from '../lib/store'
import { CARDIO, cardioById, cardioKcal, stepsKcal } from '../lib/calc'
import type { CardioKind } from '../lib/types'
import { getStepInfo, readSteps, requestStepPermission } from '../services/stepCounter'
import type { StepInfo } from '../services/stepCounter'
import { addDays, cn, fmt, haptic, todayKey } from '../lib/utils'

const ICONS: Record<CardioKind, ComponentType<{ size?: number }>> = {
  walk: Footprints,
  run: Wind,
  bike: Bike,
  elliptical: ActivityIcon,
  swim: Waves,
  sport: Trophy,
}

export const STEP_GOAL = 10000

export function ActivityPanel({ compact = false, onDone }: { compact?: boolean; onDone?: () => void }) {
  const { state, totals, addSteps, setStepsTotal, addCardio, removeCardio } = useStore()
  const p = state.profile
  const date = todayKey()
  const t = totals(date)
  const [exact, setExact] = useState('')
  const [kind, setKind] = useState<CardioKind>('walk')
  const [minutes, setMinutes] = useState(30)
  const [flash, setFlash] = useState(false)
  const [info, setInfo] = useState<StepInfo | null>(null)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    void getStepInfo().then(setInfo)
  }, [])

  const syncNow = useCallback(async () => {
    setSyncing(true)
    try {
      let cur = await getStepInfo()
      if (cur.status === 'needs-permission' && (await requestStepPermission())) cur = await getStepInfo()
      setInfo(cur)
      if (cur.status === 'ready') for (const d of await readSteps(2)) setStepsTotal(d.steps, 'health', d.date)
    } finally {
      setSyncing(false)
    }
  }, [setStepsTotal])

  const week = useMemo(
    () => Array.from({ length: 7 }, (_, i) => ({ d: addDays(date, i - 6), burned: totals(addDays(date, i - 6)).burned })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [totals, date],
  )
  const maxBurn = Math.max(300, ...week.map((w) => w.burned))

  if (!p) return null
  const source = state.steps.find((x) => x.date === date)?.source
  const exactN = parseInt(exact, 10)
  const exactOk = Number.isFinite(exactN) && exactN > 0
  const quick = (n: number) => {
    haptic(14)
    addSteps(n)
  }
  const kcalPreview = cardioKcal(kind, p.weightKg, minutes)
  const todaysCardio = state.cardio.filter((c) => c.date === date).sort((a, b) => b.u - a.u)
  const native = info && info.status !== 'web'

  return (
    <div className={cn('space-y-4', !compact && 'lg:grid lg:grid-cols-2 lg:items-start lg:gap-5 lg:space-y-0')}>
      {/* Steps */}
      <section className="card p-5">
        <div className="flex items-center gap-5">
          <Ring size={compact ? 108 : 128} stroke={12} value={t.steps / STEP_GOAL} color="#F97316">
            <Footprints size={18} className="mb-0.5 text-fire" />
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
                {fmt(stepsKcal(t.steps, p.weightKg))}
                <span className="text-sm text-white/40">kcal</span>
              </div>
              <div className="text-[11px] text-white/40">según tu peso ({p.weightKg} kg)</div>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-2xl bg-white/[0.04] px-3 py-2.5 text-[12px] text-white/55">
          <HeartPulse size={15} className={cn('shrink-0', info?.status === 'ready' ? 'text-emerald' : 'text-white/40')} />
          <span className="min-w-0 flex-1">
            {info ? info.message : 'Comprobando sensores…'}
            {source === 'health' && info?.status !== 'ready' && ' · Último dato del sensor guardado.'}
          </span>
          {native && info?.status !== 'unavailable' && (
            <button className="btn-ghost !rounded-xl !px-3 !py-1.5 text-[12px]" onClick={() => void syncNow()} disabled={syncing}>
              <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} />
              {info?.status === 'needs-permission' ? 'Conectar' : 'Sincronizar'}
            </button>
          )}
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          {[1000, 2500, 5000].map((n) => (
            <button key={n} onClick={() => quick(n)} className="num rounded-2xl bg-fire/12 py-3 text-[14px] font-bold text-fire active:scale-95">
              +{fmt(n)}
            </button>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <input className="input num" inputMode="numeric" placeholder="Cifra exacta (ej. 7342)" value={exact} onChange={(e) => setExact(e.target.value.replace(/\D/g, '').slice(0, 6))} />
          <button
            className="btn-ghost !px-3.5 text-[13px]"
            disabled={!exactOk}
            onClick={() => {
              quick(exactN)
              setExact('')
            }}
          >
            Sumar
          </button>
          <button
            className="btn-primary !px-3.5 text-[13px]"
            disabled={!exactOk}
            title="Sustituye el total de hoy por esta cifra"
            onClick={() => {
              haptic(14)
              setStepsTotal(exactN, 'manual')
              setExact('')
            }}
          >
            Fijar
          </button>
        </div>
      </section>

      {/* Cardio */}
      <section className="card p-5">
        <p className="label mb-3">Cardio y deporte</p>
        <div className="grid grid-cols-3 gap-2">
          {CARDIO.map((c) => {
            const Icon = ICONS[c.id]
            const on = kind === c.id
            return (
              <button
                key={c.id}
                onClick={() => {
                  haptic(6)
                  setKind(c.id)
                }}
                className={cn('flex flex-col items-center gap-1.5 rounded-2xl border px-1 py-3 transition active:scale-95', on ? 'border-fire/60 bg-fire/12 text-fire' : 'border-line bg-white/[0.03] text-white/60')}
              >
                <Icon size={22} />
                <span className="text-center text-[11px] font-bold leading-tight">{c.name}</span>
              </button>
            )
          })}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <span className="text-[13px] font-bold text-white/60">Duración</span>
          <Stepper value={minutes} onChange={setMinutes} step={5} min={5} max={300} unit="min" />
        </div>

        <div className="mt-3 flex items-center justify-between rounded-2xl border border-fire/25 bg-fire/[0.07] p-4">
          <div>
            <div className="label !text-fire/80">Quemarás</div>
            <div className="num text-[11px] text-white/40">
              0,0175 × {cardioById(kind).met} MET × {p.weightKg} kg × {minutes} min
            </div>
          </div>
          <div className="num flex items-baseline gap-1 text-[32px] font-bold text-fire">
            {fmt(kcalPreview)}
            <span className="text-sm text-white/40">kcal</span>
          </div>
        </div>

        <button
          className="btn-primary mt-3 w-full"
          onClick={() => {
            haptic([14, 30, 14])
            addCardio({ date, cardio: kind, minutes, kcal: kcalPreview })
            setFlash(true)
            window.setTimeout(() => {
              setFlash(false)
              onDone?.()
            }, compact ? 700 : 1200)
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

      {!compact && (
        <>
          <section className="card p-5 lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <p className="label">Calorías activas · 7 días</p>
              <span className="num text-[12px] text-white/40">{fmt(week.reduce((a, w) => a + w.burned, 0))} kcal</span>
            </div>
            <div className="flex h-28 items-end gap-2">
              {week.map((w) => {
                const isToday = w.d === date
                return (
                  <div key={w.d} className="flex flex-1 flex-col items-center gap-1.5">
                    <span className="num text-[9px] text-white/35">{w.burned > 0 ? fmt(w.burned) : ''}</span>
                    <div className="flex w-full flex-1 items-end">
                      <div className={cn('w-full rounded-lg', isToday ? 'bg-fire' : 'bg-fire/35')} style={{ height: `${Math.max(4, (w.burned / maxBurn) * 100)}%` }} />
                    </div>
                    <span className={cn('text-[10px] font-bold', isToday ? 'text-white' : 'text-white/35')}>
                      {new Date(w.d + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'narrow' })}
                    </span>
                  </div>
                )
              })}
            </div>
          </section>

          {todaysCardio.length > 0 && (
            <section className="card p-5">
              <p className="label mb-2">Cardio de hoy</p>
              <ul className="divide-y divide-line">
                {todaysCardio.map((c) => {
                  const Icon = ICONS[c.cardio]
                  return (
                    <li key={c.id} className="flex items-center gap-3 py-2.5">
                      <div className="grid h-9 w-9 place-items-center rounded-xl bg-fire/12 text-fire">
                        <Icon size={17} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[14px] font-bold">{cardioById(c.cardio).name}</div>
                        <div className="num text-[12px] text-white/40">{c.minutes} min</div>
                      </div>
                      <div className="num text-[14px] font-bold text-fire">
                        {fmt(c.kcal)}
                        <span className="ml-0.5 text-[10px] text-white/35">kcal</span>
                      </div>
                      <button aria-label="Eliminar" className="grid h-9 w-9 place-items-center rounded-xl text-white/30 active:text-fire" onClick={() => removeCardio(c.id)}>
                        <Trash2 size={16} />
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  )
}
