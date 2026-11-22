import { useId, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Scale, TrendingDown, TrendingUp } from 'lucide-react'
import { useStore } from '../lib/store'
import { haptic, round1, todayKey } from '../lib/utils'

/** Catmull-Rom → cubic Bézier: a smooth curve through every point. */
function smooth(pts: [number, number][]): string {
  if (pts.length < 2) return ''
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2] ?? p2
    const c1: [number, number] = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]
    const c2: [number, number] = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
    d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`
  }
  return d
}

/** Bento tile: smooth weight curve with gradient area + glowing last point, and a quick weigh-in. */
export function WeightCard({ date }: { date?: string }) {
  const { state, addWeight } = useStore()
  const id = useId().replace(/:/g, '')
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState('')
  const day = date ?? todayKey()

  const pts = useMemo(() => [...state.weights].sort((a, b) => a.date.localeCompare(b.date)).slice(-30), [state.weights])
  const p = state.profile
  const latest = pts.at(-1)?.kg ?? p?.weightKg ?? 0
  const first = pts[0]?.kg ?? latest
  const delta = round1(latest - first)

  const W = 300
  const H = 96
  const chart = useMemo(() => {
    if (pts.length < 2) return null
    const vals = pts.map((x) => x.kg)
    const lo = Math.min(...vals, p?.targetKg ?? Infinity) - 0.6
    const hi = Math.max(...vals) + 0.6
    const xs = (i: number) => (i / (pts.length - 1)) * W
    const ys = (v: number) => 8 + (H - 16) - ((v - lo) / (hi - lo || 1)) * (H - 16)
    const xy = pts.map((pt, i): [number, number] => [xs(i), ys(pt.kg)])
    const line = smooth(xy)
    return { line, area: `${line} L${W},${H} L0,${H} Z`, target: p ? ys(p.targetKg) : null, last: xy[xy.length - 1] }
  }, [pts, p])

  const save = () => {
    const n = parseFloat(val.replace(',', '.'))
    if (Number.isFinite(n) && n >= 30 && n <= 300) {
      haptic(15)
      addWeight(round1(n), day)
      setEditing(false)
      setVal('')
    }
  }
  const goalDiff = p ? round1(latest - p.targetKg) : 0

  return (
    <section className="card flex flex-col p-4">
      <div className="flex items-start justify-between">
        <span className="label flex items-center gap-1.5">
          <Scale size={12} /> Evolución de peso
        </span>
        {pts.length > 1 && (
          <span className={`num flex items-center gap-0.5 text-[11px] ${delta <= 0 ? 'text-emerald' : 'text-fire'}`}>
            {delta <= 0 ? <TrendingDown size={12} /> : <TrendingUp size={12} />}
            {Math.abs(delta)} kg
          </span>
        )}
      </div>

      <div className="num mt-2 flex items-baseline gap-1">
        <span className="text-[30px] font-bold leading-none">{latest.toFixed(1)}</span>
        <span className="text-[12px] text-white/45">kg</span>
      </div>
      {p && (
        <p className="mt-0.5 text-[11px] text-white/40">
          Objetivo <span className="num">{p.targetKg}</span> kg · {goalDiff === 0 ? '¡conseguido!' : <span className="num">{Math.abs(goalDiff)} kg {goalDiff > 0 ? 'por bajar' : 'por subir'}</span>}
        </p>
      )}

      <div className="mt-2 min-h-[96px] flex-1">
        {chart ? (
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full overflow-visible" role="img" aria-label="Gráfica de peso">
            <defs>
              <linearGradient id={`wa-${id}`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#10B981" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
              </linearGradient>
              <linearGradient id={`wl-${id}`} x1="0" x2="1" y1="0" y2="0">
                <stop offset="0%" stopColor="#06B6D4" />
                <stop offset="100%" stopColor="#10B981" />
              </linearGradient>
            </defs>
            {chart.target !== null && <line x1="0" x2={W} y1={chart.target} y2={chart.target} stroke="rgba(255,255,255,0.16)" strokeDasharray="3 5" />}
            <path d={chart.area} fill={`url(#wa-${id})`} />
            <motion.path d={chart.line} fill="none" stroke={`url(#wl-${id})`} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.1, ease: 'easeOut' }} />
            <circle cx={chart.last[0]} cy={chart.last[1]} r="9" fill="#10B981" opacity="0.22" />
            <circle cx={chart.last[0]} cy={chart.last[1]} r="4" fill="#10B981" stroke="#d1fae5" strokeWidth="1.5" style={{ filter: 'drop-shadow(0 0 6px #10B981)' }} />
          </svg>
        ) : (
          <p className="rounded-2xl bg-white/[0.03] px-3 py-6 text-center text-[12px] text-white/40">Registra tu peso varios días para ver la curva.</p>
        )}
      </div>

      {editing ? (
        <div className="mt-2 flex gap-2">
          <input autoFocus className="input num !py-2" inputMode="decimal" placeholder="74.6" value={val} onChange={(e) => setVal(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && save()} aria-label="Peso en kilos" />
          <button className="btn-primary !px-4 !py-2" onClick={save}>
            OK
          </button>
        </div>
      ) : (
        <button className="btn-ghost mt-2 w-full !py-2.5 text-[13px]" onClick={() => setEditing(true)}>
          <Scale size={14} /> Registrar peso hoy
        </button>
      )}
    </section>
  )
}
