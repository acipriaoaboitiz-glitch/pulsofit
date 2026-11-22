import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Check, Droplets, Flame, Sparkles } from 'lucide-react'
import { useStore } from '../lib/store'
import { ACTIVITY_LABELS, GOAL_LABELS, computeTargets } from '../lib/metabolic'
import type { ActivityLevel, Goal, Profile, Sex, Targets } from '../lib/types'
import { cn, fmt, haptic, todayKey } from '../lib/utils'
import { Segmented } from '../components/bits'
import { Ring, SpringNumber } from '../components/Ring'

type Draft = Omit<Profile, 'u'>

function NumField({
  label,
  value,
  onChange,
  unit,
  min,
  max,
}: {
  label: string
  value: number
  onChange: (n: number) => void
  unit: string
  min: number
  max: number
}) {
  const [raw, setRaw] = useState(String(value))
  return (
    <label className="block">
      <span className="label">{label}</span>
      <div className="relative mt-1.5">
        <input
          className="input num pr-14 text-xl font-bold"
          inputMode="decimal"
          value={raw}
          onChange={(e) => {
            const t = e.target.value.replace(',', '.')
            if (!/^\d{0,3}(\.\d{0,1})?$/.test(t)) return
            setRaw(t)
            const n = parseFloat(t)
            if (Number.isFinite(n)) onChange(Math.min(max, Math.max(min, n)))
          }}
          onBlur={() => {
            const n = parseFloat(raw)
            const v = Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : value
            setRaw(String(v))
            onChange(v)
          }}
        />
        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-white/40">
          {unit}
        </span>
      </div>
    </label>
  )
}

/** "Tu plan está listo": the ring draws itself and the numbers count up before entering the app. */
function PlanReveal({ plan, onDone }: { plan: Targets; onDone: () => void }) {
  const [go, setGo] = useState(false)
  useEffect(() => {
    const a = window.setTimeout(() => setGo(true), 350)
    const b = window.setTimeout(onDone, 3400)
    return () => {
      window.clearTimeout(a)
      window.clearTimeout(b)
    }
  }, [onDone])

  return (
    <motion.div className="fixed inset-0 z-[9000] flex flex-col items-center justify-center bg-[#05070B]/95 px-6 text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
      <motion.p className="label mb-6" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        Calculando tu plan
      </motion.p>
      <Ring size={230} stroke={18} value={go ? 1 : 0} gradient={['#10B981', '#06B6D4']}>
        <SpringNumber value={go ? plan.kcal : 0} className="num text-[48px] font-bold leading-none" />
        <span className="label mt-1.5">kcal al día</span>
      </Ring>
      <div className="mt-8 grid w-full max-w-[340px] grid-cols-3 gap-2.5">
        {[
          { l: 'Proteína', v: plan.protein, c: '#10B981' },
          { l: 'Carbos', v: plan.carbs, c: '#06B6D4' },
          { l: 'Grasas', v: plan.fat, c: '#8B5CF6' },
        ].map((m, i) => (
          <motion.div key={m.l} className="card-raised py-3" initial={{ opacity: 0, y: 16 }} animate={{ opacity: go ? 1 : 0, y: go ? 0 : 16 }} transition={{ delay: 0.9 + i * 0.15, type: 'spring', damping: 24, stiffness: 300 }}>
            <div className="num text-[22px] font-bold" style={{ color: m.c }}>
              <SpringNumber value={go ? m.v : 0} />
              <span className="text-[11px] text-white/40">g</span>
            </div>
            <div className="label !text-[9px]">{m.l}</div>
          </motion.div>
        ))}
      </div>
      <motion.p className="mt-7 text-[15px] font-bold text-white/80" initial={{ opacity: 0 }} animate={{ opacity: go ? 1 : 0 }} transition={{ delay: 1.8 }}>
        Tu plan está listo ✦
      </motion.p>
      <motion.button className="btn-primary mt-5 w-full max-w-[340px]" initial={{ opacity: 0 }} animate={{ opacity: go ? 1 : 0 }} transition={{ delay: 2.1 }} onClick={onDone}>
        Entrar
      </motion.button>
    </motion.div>
  )
}

export function Onboarding() {
  const { saveProfile, addWeight } = useStore()
  const [step, setStep] = useState(0)
  const [reveal, setReveal] = useState(false)
  const saved = useRef(false)
  const [dir, setDir] = useState(1)
  const [d, setD] = useState<Draft>({
    sex: 'male',
    age: 28,
    heightCm: 175,
    weightKg: 75,
    targetKg: 72,
    activity: 'moderate',
    goal: 'recomp',
  })
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }))

  const preview = useMemo(() => computeTargets({ ...d, u: 0 }), [d])

  const go = (n: number) => {
    haptic(10)
    setDir(n > step ? 1 : -1)
    setStep(n)
  }

  const commit = () => {
    if (saved.current) return
    saved.current = true
    saveProfile(d)
    addWeight(d.weightKg, todayKey())
  }
  const finish = () => {
    haptic([20, 40, 20])
    setReveal(true)
  }

  const valid = d.age >= 14 && d.heightCm >= 120 && d.weightKg >= 30 && d.targetKg >= 30

  return (
    <div className="page-bg flex min-h-full flex-col px-5 pb-[calc(24px+var(--safe-bottom))] pt-[calc(24px+var(--safe-top))]">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-emerald text-[#04130d]">
            <Sparkles size={20} strokeWidth={2.8} />
          </div>
          <span className="text-xl font-extrabold tracking-tight">PULSO</span>
        </div>
        <div className="flex gap-1.5" aria-label={`Paso ${step + 1} de 3`}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={cn('h-1.5 rounded-full transition-all', i === step ? 'w-8 bg-emerald' : i < step ? 'w-4 bg-emerald/60' : 'w-4 bg-white/15')}
            />
          ))}
        </div>
      </div>

      <div className="relative flex-1">
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div
            key={step}
            custom={dir}
            initial={{ opacity: 0, x: 40 * dir }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 * dir }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
          >
            {step === 0 && (
              <div className="space-y-5">
                <div>
                  <h1 className="text-[30px] font-extrabold leading-tight tracking-tight">Cuéntanos sobre ti</h1>
                  <p className="mt-1.5 text-white/50">Calcularemos tu metabolismo con la fórmula Mifflin-St Jeor.</p>
                </div>
                <Segmented<Sex>
                  value={d.sex}
                  onChange={(v) => set('sex', v)}
                  options={[
                    { id: 'male', label: 'Hombre' },
                    { id: 'female', label: 'Mujer' },
                  ]}
                />
                <div className="grid grid-cols-2 gap-3">
                  <NumField label="Edad" value={d.age} onChange={(v) => set('age', v)} unit="años" min={14} max={99} />
                  <NumField label="Altura" value={d.heightCm} onChange={(v) => set('heightCm', v)} unit="cm" min={120} max={230} />
                  <NumField label="Peso actual" value={d.weightKg} onChange={(v) => set('weightKg', v)} unit="kg" min={30} max={300} />
                  <NumField label="Peso objetivo" value={d.targetKg} onChange={(v) => set('targetKg', v)} unit="kg" min={30} max={300} />
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-5">
                <div>
                  <h1 className="text-[30px] font-extrabold leading-tight tracking-tight">¿Cómo de activo eres?</h1>
                  <p className="mt-1.5 text-white/50">Sin contar el entreno que registres en la app.</p>
                </div>
                <div className="space-y-2.5">
                  {(Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map((k) => (
                    <button
                      key={k}
                      onClick={() => {
                        haptic(8)
                        set('activity', k)
                      }}
                      className={cn(
                        'flex w-full items-center justify-between rounded-2xl border p-4 text-left transition active:scale-[0.98]',
                        d.activity === k ? 'border-emerald/60 bg-emerald/10' : 'border-line bg-card',
                      )}
                    >
                      <div>
                        <div className="font-bold">{ACTIVITY_LABELS[k].name}</div>
                        <div className="text-[13px] text-white/50">{ACTIVITY_LABELS[k].desc}</div>
                      </div>
                      {d.activity === k && <Check className="text-emerald" size={20} strokeWidth={3} />}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5">
                <div>
                  <h1 className="text-[30px] font-extrabold leading-tight tracking-tight">Tu objetivo</h1>
                  <p className="mt-1.5 text-white/50">Ajustamos calorías y macros automáticamente.</p>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  {(Object.keys(GOAL_LABELS) as Goal[]).map((k) => (
                    <button
                      key={k}
                      onClick={() => {
                        haptic(8)
                        set('goal', k)
                      }}
                      className={cn(
                        'rounded-2xl border p-3.5 text-left transition active:scale-[0.97]',
                        d.goal === k ? 'border-emerald/60 bg-emerald/10' : 'border-line bg-card',
                      )}
                    >
                      <div className="text-[15px] font-bold">{GOAL_LABELS[k].name}</div>
                      <div className="text-[12px] text-white/50">{GOAL_LABELS[k].desc}</div>
                    </button>
                  ))}
                </div>

                <div className="card space-y-4 p-5">
                  <div className="flex items-center justify-between">
                    <span className="label">Tu plan diario</span>
                    <span className="num text-[11px] text-white/40">
                      BMR {fmt(preview.bmr)} · TDEE {fmt(preview.tdee)}
                    </span>
                  </div>
                  <div className="flex items-end gap-2">
                    <Flame className="mb-1.5 text-fire" size={26} />
                    <span className="num text-5xl font-bold leading-none">{fmt(preview.kcal)}</span>
                    <span className="mb-1 text-white/45">kcal</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    {[
                      { l: 'Proteína', v: preview.protein, c: '#10B981' },
                      { l: 'Carbos', v: preview.carbs, c: '#F97316' },
                      { l: 'Grasas', v: preview.fat, c: '#8B5CF6' },
                    ].map((m) => (
                      <div key={m.l} className="card-raised py-3">
                        <div className="num text-xl font-bold" style={{ color: m.c }}>
                          {m.v}
                          <span className="text-xs text-white/40">g</span>
                        </div>
                        <div className="text-[11px] font-semibold text-white/50">{m.l}</div>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 text-[13px] text-white/60">
                    <Droplets size={16} className="text-aqua" />
                    Agua: <b className="num text-aqua">{fmt(preview.waterMl)} ml</b> (+500 ml días de entreno)
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mt-8 flex gap-3">
        {step > 0 && (
          <button className="btn-ghost px-5" onClick={() => go(step - 1)} aria-label="Atrás">
            <ArrowLeft size={20} />
          </button>
        )}
        {step < 2 ? (
          <button className="btn-primary flex-1" disabled={step === 0 && !valid} onClick={() => go(step + 1)}>
            Continuar <ArrowRight size={18} />
          </button>
        ) : (
          <button className="btn-primary flex-1" onClick={finish}>
            Empezar con PULSO <Sparkles size={18} />
          </button>
        )}
      </div>

      <AnimatePresence>{reveal && <PlanReveal plan={preview} onDone={commit} />}</AnimatePresence>

    </div>
  )
}
