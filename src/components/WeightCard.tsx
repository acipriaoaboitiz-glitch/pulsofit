import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Scale, TrendingDown, TrendingUp } from 'lucide-react'
import { useStore } from '../lib/store'
import { haptic, round1, todayKey } from '../lib/utils'

export function WeightCard() {
  const { state, addWeight } = useStore()
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState('')

  const pts = useMemo(
    () => [...state.weights].sort((a, b) => a.date.localeCompare(b.date)).slice(-30),
    [state.weights],
  )
  const p = state.profile
  const latest = pts.at(-1)?.kg ?? p?.weightKg ?? 0
  const first = pts[0]?.kg ?? latest
  const delta = round1(latest - first)

  const W = 300
  const H = 84
  const path = useMemo(() => {
    if (pts.length < 2) return null
    const vals = pts.map((x) => x.kg)
    const lo = Math.min(...vals, p?.targetKg ?? Infinity) - 0.5
    const hi = Math.max(...vals) + 0.5
    const xs = (i: number) => (i / (pts.length - 1)) * W
    const ys = (v: number) => H - ((v - lo) / (hi - lo || 1)) * H
    const d = pts.map((pt, i) => `${i ? 'L' : 'M'}${xs(i).toFixed(1)},${ys(pt.kg).toFixed(1)}`).join(' ')
    const target = p ? ys(p.targetKg) : null
    return { d, area: `${d} L${W},${H} L0,${H} Z`, target, lastX: xs(pts.length - 1), lastY: ys(vals[vals.length - 1]) }
  }, [pts, p])

  const save = () => {
    const n = parseFloat(val.replace(',', '.'))
    if (Number.isFinite(n) && n >= 30 && n <= 300) {
      haptic(15)
      addWeight(round1(n), todayKey())
      setEditing(false)
      setVal('')
    }
  }

  const goalDiff = p ? round1(latest - p.targetKg) : 0

  return (
    <section className="card p-5">
      <div className="mb-3 flex items-start justify-between">
        <div>
          <p className="label">Peso corporal</p>
          <div className="num mt-1 flex items-baseline gap-1.5">
            <span className="text-[32px] font-bold leading-none">{latest.toFixed(1)}</span>
            <span className="text-sm text-white/45">kg</span>
            {pts.length > 1 && (
              <span className={`ml-2 flex items-center gap-0.5 text-[12px] font-bold ${delta <= 0 ? 'text-emerald' : 'text-fire'}`}>
                {delta <= 0 ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
                {Math.abs(delta)}
              </span>
            )}
          </div>
          {p && (
            <p className="mt-1 text-[12px] text-white/45">
              Objetivo {p.targetKg} kg · {goalDiff === 0 ? '¡conseguido!' : `${Math.abs(goalDiff)} kg ${goalDiff > 0 ? 'por bajar' : 'por subir'}`}
            </p>
          )}
        </div>
        <button className="btn-ghost !rounded-xl !px-3 !py-2 text-[13px]" onClick={() => setEditing((e) => !e)}>
          <Scale size={15} /> Pesarme
        </button>
      </div>

      {editing && (
        <div className="mb-3 flex gap-2">
          <input
            autoFocus
            className="input num"
            inputMode="decimal"
            placeholder="Ej. 74.6"
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && save()}
          />
          <button className="btn-primary" onClick={save}>
            Guardar
          </button>
        </div>
      )}

      {path ? (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full overflow-visible">
          <defs>
            <linearGradient id="wgrad" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
            </linearGradient>
          </defs>
          {path.target !== null && (
            <line x1="0" x2={W} y1={path.target} y2={path.target} stroke="rgba(255,255,255,0.18)" strokeDasharray="4 5" />
          )}
          <path d={path.area} fill="url(#wgrad)" />
          <motion.path
            d={path.d}
            fill="none"
            stroke="#10B981"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
          <circle cx={path.lastX} cy={path.lastY} r="4" fill="#10B981" />
        </svg>
      ) : (
        <p className="rounded-2xl bg-white/[0.03] py-5 text-center text-[13px] text-white/40">
          Registra tu peso en varios días para ver la gráfica.
        </p>
      )}
    </section>
  )
}
