import { useState } from 'react'
import { Minus, Plus } from 'lucide-react'
import { Sheet } from '../components/Sheet'
import { PLATE_COLORS, platesFor } from '../lib/calc'
import { cn, haptic } from '../lib/utils'

/** Plate height in the drawing (px) – heavier plates are taller. */
const plateH = (kg: number): number => 28 + kg * 2.2
const plateW = (kg: number): number => (kg >= 15 ? 12 : kg >= 5 ? 9 : 6)

function BarDrawing({ perSide }: { perSide: number[] }) {
  // collar → plates heaviest first, from the centre outwards
  const widths = perSide.map(plateW)
  const sleeve = 20 + widths.reduce((a, w) => a + w + 2, 0)
  const W = 300
  const cy = 60
  let xr = W / 2 + 32
  let xl = W / 2 - 32
  return (
    <svg viewBox={`0 0 ${W} 120`} className="mx-auto w-full max-w-[340px]" role="img" aria-label="Discos a cada lado de la barra">
      <rect x="10" y={cy - 4} width={W - 20} height="8" rx="4" fill="#52525B" />
      <rect x={W / 2 - 30} y={cy - 9} width="60" height="18" rx="3" fill="#3F3F46" />
      <rect x={W / 2 + 30} y={cy - 7} width="4" height="14" rx="1" fill="#A1A1AA" />
      <rect x={W / 2 - 34} y={cy - 7} width="4" height="14" rx="1" fill="#A1A1AA" />
      {perSide.map((kg, i) => {
        const w = widths[i]!
        const h = plateH(kg)
        const R = (
          <rect key={`r${i}`} x={xr} y={cy - h / 2} width={w} height={h} rx="2.5" fill={PLATE_COLORS[kg]} stroke="rgba(0,0,0,0.35)" />
        )
        const L = (
          <rect key={`l${i}`} x={xl - w} y={cy - h / 2} width={w} height={h} rx="2.5" fill={PLATE_COLORS[kg]} stroke="rgba(0,0,0,0.35)" />
        )
        xr += w + 2
        xl -= w + 2
        return [L, R]
      })}
      <text x={W / 2 + 34 + sleeve / 2} y="112" textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.35)" fontFamily="JetBrains Mono">
        {perSide.length ? 'por lado' : ''}
      </text>
    </svg>
  )
}

export function PlateSheet({ open, kg, exercise, onClose, onChange }: { open: boolean; kg: number; exercise: string; onClose: () => void; onChange: (kg: number) => void }) {
  const [bar, setBar] = useState(20)
  const calc = platesFor(kg, bar)
  const grouped = calc.perSide.reduce<Record<number, number>>((acc, p) => ({ ...acc, [p]: (acc[p] ?? 0) + 1 }), {})

  return (
    <Sheet open={open} onClose={onClose} title="Calculadora de discos" z={90}>
      <p className="mb-3 truncate text-[13px] text-white/50">{exercise}</p>

      <div className="mb-4 flex items-center justify-center gap-3">
        <button className="grid h-12 w-12 place-items-center rounded-2xl bg-white/[0.06] active:scale-90" aria-label="Menos 2,5 kilos" onClick={() => { haptic(8); onChange(Math.max(0, kg - 2.5)) }}>
          <Minus size={20} />
        </button>
        <div className="num min-w-[130px] text-center">
          <span className="text-[44px] font-bold leading-none">{kg}</span>
          <span className="ml-1 text-lg text-white/45">kg</span>
        </div>
        <button className="grid h-12 w-12 place-items-center rounded-2xl bg-white/[0.06] active:scale-90" aria-label="Más 2,5 kilos" onClick={() => { haptic(8); onChange(kg + 2.5) }}>
          <Plus size={20} />
        </button>
      </div>

      {calc.belowBar ? (
        <p className="rounded-2xl bg-fire/10 p-4 text-center text-[13px] text-fire">Menos que la barra olímpica ({bar} kg).</p>
      ) : (
        <>
          <BarDrawing perSide={calc.perSide} />
          <div className="card-raised mt-3 p-4">
            <p className="label mb-2">A cada lado</p>
            {calc.perSide.length === 0 ? (
              <p className="text-[14px] text-white/60">Solo la barra.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {Object.entries(grouped)
                  .sort((a, b) => Number(b[0]) - Number(a[0]))
                  .map(([plate, n]) => (
                    <span key={plate} className="num inline-flex items-center gap-1.5 rounded-xl border border-line bg-white/[0.04] px-3 py-1.5 text-[14px] font-bold">
                      <span className="h-3 w-3 rounded-sm" style={{ background: PLATE_COLORS[Number(plate)] }} />
                      {n} × {plate}
                    </span>
                  ))}
              </div>
            )}
            {calc.remainder > 0 && (
              <p className="num mt-3 text-[12px] text-fire">Faltan {calc.remainder} kg que no se pueden montar con discos de 1,25 kg o más.</p>
            )}
          </div>
        </>
      )}

      <div className="mt-4 flex items-center justify-between">
        <span className="label">Barra</span>
        <div className="flex gap-1.5">
          {[20, 15, 10].map((b) => (
            <button key={b} onClick={() => setBar(b)} className={cn('num rounded-xl px-3 py-2 text-[13px] font-bold', bar === b ? 'bg-neon text-white' : 'bg-white/[0.06] text-white/55')}>
              {b} kg
            </button>
          ))}
        </div>
      </div>
    </Sheet>
  )
}
