import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { clamp } from '../lib/utils'

interface RingProps {
  size: number
  stroke: number
  /** 0..1 (values > 1 clamp) */
  value: number
  color: string
  track?: string
  children?: ReactNode
  glow?: boolean
}

export function Ring({ size, stroke, value, color, track = 'rgba(255,255,255,0.07)', children, glow = true }: RingProps) {
  const r = (size - stroke) / 2
  const c = size / 2
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={c} cy={c} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <motion.circle
          cx={c}
          cy={c}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: clamp(value, 0, 1), opacity: value > 0.004 ? 1 : 0 }}
          transition={{ type: 'spring', stiffness: 60, damping: 16, mass: 0.9 }}
          style={glow ? { filter: `drop-shadow(0 0 6px ${color}88)` } : undefined}
        />
      </svg>
      {children && <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>}
    </div>
  )
}
