import { useMemo } from 'react'
import type { Muscle } from '../lib/types'
import type { MuscleLoad } from '../lib/workout'
import { MUSCLES } from '../lib/exercises'

type Shape =
  | { t: 'e'; cx: number; cy: number; rx: number; ry: number; rot?: number }
  | { t: 'r'; x: number; y: number; w: number; h: number; r: number }
  | { t: 'p'; d: string }

interface Region {
  muscle: Muscle
  shape: Shape
}

const e = (cx: number, cy: number, rx: number, ry: number, rot = 0): Shape => ({ t: 'e', cx, cy, rx, ry, rot })
const r = (x: number, y: number, w: number, h: number, rr = 5): Shape => ({ t: 'r', x, y, w, h, r: rr })
const p = (d: string): Shape => ({ t: 'p', d })

/** Front view is centred on x=65, back view on x=195 (viewBox 260 × 280). */
const FRONT: Region[] = [
  { muscle: 'Hombros', shape: e(40, 58, 11, 10) },
  { muscle: 'Hombros', shape: e(90, 58, 11, 10) },
  { muscle: 'Pecho', shape: r(48, 56, 16.5, 22, 7) },
  { muscle: 'Pecho', shape: r(65.5, 56, 16.5, 22, 7) },
  { muscle: 'Bíceps', shape: e(32, 84, 7, 15, 6) },
  { muscle: 'Bíceps', shape: e(98, 84, 7, 15, -6) },
  { muscle: 'Core', shape: r(55, 81, 20, 14, 5) },
  { muscle: 'Core', shape: r(55, 97, 20, 14, 5) },
  { muscle: 'Core', shape: r(55, 113, 20, 14, 5) },
  { muscle: 'Cuádriceps', shape: e(53, 170, 12, 33, 3) },
  { muscle: 'Cuádriceps', shape: e(77, 170, 12, 33, -3) },
  { muscle: 'Gemelos', shape: e(51, 238, 8, 24) },
  { muscle: 'Gemelos', shape: e(79, 238, 8, 24) },
]

const BACK: Region[] = [
  { muscle: 'Espalda', shape: p('M185 46 L205 46 L216 62 L195 72 L174 62 Z') },
  { muscle: 'Hombros', shape: e(170, 60, 10, 9) },
  { muscle: 'Hombros', shape: e(220, 60, 10, 9) },
  { muscle: 'Espalda', shape: p('M176 68 L193 76 L193 110 L182 108 L172 88 Z') },
  { muscle: 'Espalda', shape: p('M214 68 L197 76 L197 110 L208 108 L218 88 Z') },
  { muscle: 'Espalda', shape: r(183, 112, 24, 14, 5) },
  { muscle: 'Tríceps', shape: e(162, 84, 7, 15, 6) },
  { muscle: 'Tríceps', shape: e(228, 84, 7, 15, -6) },
  { muscle: 'Glúteos', shape: e(186, 142, 12, 12) },
  { muscle: 'Glúteos', shape: e(204, 142, 12, 12) },
  { muscle: 'Isquios', shape: e(183, 184, 11, 28, 3) },
  { muscle: 'Isquios', shape: e(207, 184, 11, 28, -3) },
  { muscle: 'Gemelos', shape: e(181, 240, 8, 22) },
  { muscle: 'Gemelos', shape: e(209, 240, 8, 22) },
]

/** neutral body silhouette (head, torso, limbs) so the muscles read as a figure */
const BODY: Shape[] = [
  e(65, 22, 13, 15), r(59, 34, 12, 12, 4), r(36, 48, 58, 86, 14),
  e(32, 84, 9, 20, 6), e(98, 84, 9, 20, -6), e(28, 118, 7, 18, 4), e(102, 118, 7, 18, -4),
  e(53, 172, 15, 40, 3), e(77, 172, 15, 40, -3), e(51, 240, 10, 30), e(79, 240, 10, 30),
  e(195, 22, 13, 15), r(189, 34, 12, 12, 4), r(166, 48, 58, 86, 14),
  e(162, 84, 9, 20, 6), e(228, 84, 9, 20, -6), e(158, 118, 7, 18, 4), e(232, 118, 7, 18, -4),
  e(183, 172, 15, 44, 3), e(207, 172, 15, 44, -3), e(181, 242, 10, 30), e(209, 242, 10, 30),
]

function ShapeEl({ s, fill, stroke, sw = 1 }: { s: Shape; fill: string; stroke: string; sw?: number }) {
  if (s.t === 'e') return <ellipse cx={s.cx} cy={s.cy} rx={s.rx} ry={s.ry} transform={s.rot ? `rotate(${s.rot} ${s.cx} ${s.cy})` : undefined} fill={fill} stroke={stroke} strokeWidth={sw} />
  if (s.t === 'r') return <rect x={s.x} y={s.y} width={s.w} height={s.h} rx={s.r} fill={fill} stroke={stroke} strokeWidth={sw} />
  return <path d={s.d} fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
}

const H48 = 48 * 3600 * 1000

export interface MuscleStyle {
  fill: string
  stroke: string
  trained: boolean
  /** 0 = just trained … 1 = recovered */
  recovery: number
}

/** Trained in the last 48 h → violet (stronger when more recent); otherwise "fresh" in soft emerald. */
export function muscleStyle(load: MuscleLoad | undefined, now: number): MuscleStyle {
  if (!load || load.lastAt === 0 || now - load.lastAt >= H48) return { fill: 'rgba(16,185,129,0.12)', stroke: 'rgba(16,185,129,0.4)', trained: false, recovery: 1 }
  const rec = Math.max(0, (now - load.lastAt) / H48)
  const alpha = 0.95 - rec * 0.6
  return { fill: `rgba(139,92,246,${alpha.toFixed(2)})`, stroke: 'rgba(196,181,253,0.7)', trained: true, recovery: rec }
}

export const hoursAgo = (at: number, now: number): number => Math.max(0, Math.round((now - at) / 3600000))

export function MuscleMap({ load, now }: { load: Partial<Record<Muscle, MuscleLoad>>; now: number }) {
  const styles = useMemo(() => Object.fromEntries(MUSCLES.map((m) => [m, muscleStyle(load[m], now)])) as Record<Muscle, MuscleStyle>, [load, now])
  const trained = MUSCLES.filter((m) => styles[m].trained).sort((a, b) => styles[a].recovery - styles[b].recovery)
  const fresh = MUSCLES.filter((m) => !styles[m].trained)

  return (
    <div>
      <svg viewBox="0 0 260 280" className="mx-auto w-full max-w-[340px]" role="img" aria-label="Mapa muscular de recuperación">
        {BODY.map((s, i) => <ShapeEl key={`b${i}`} s={s} fill="rgba(255,255,255,0.035)" stroke="rgba(255,255,255,0.08)" />)}
        {[...FRONT, ...BACK].map((reg, i) => {
          const st = styles[reg.muscle]
          return <ShapeEl key={i} s={reg.shape} fill={st.fill} stroke={st.stroke} sw={0.8} />
        })}
        <text x="65" y="276" textAnchor="middle" fontSize="8" fill="rgba(255,255,255,0.35)" fontFamily="Plus Jakarta Sans">FRENTE</text>
        <text x="195" y="276" textAnchor="middle" fontSize="8" fill="rgba(255,255,255,0.35)" fontFamily="Plus Jakarta Sans">ESPALDA</text>
      </svg>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {trained.map((m) => (
          <span key={m} className="num rounded-full border border-neon/40 bg-neon/15 px-2.5 py-1 text-[11px] font-bold text-violet-200">
            {m} · hace {hoursAgo(load[m]!.lastAt, now)} h
          </span>
        ))}
        {fresh.map((m) => (
          <span key={m} className="rounded-full border border-emerald/25 bg-emerald/10 px-2.5 py-1 text-[11px] font-semibold text-emerald">
            {m} · fresco
          </span>
        ))}
      </div>
    </div>
  )
}
