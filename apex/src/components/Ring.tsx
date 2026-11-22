import { useEffect, useId, useState } from 'react'
import type { ReactNode } from 'react'
import { motion, useMotionValueEvent, useSpring } from 'framer-motion'
import { clamp, fmt } from '../lib/utils'

interface RingProps {
  size: number
  stroke: number
  /** 0..1 (values > 1 clamp) */
  value: number
  /** solid colour (used when no gradient is given) */
  color?: string
  /** from → to along the arc, e.g. ['#10B981', '#06B6D4'] */
  gradient?: [string, string]
  track?: string
  children?: ReactNode
  glow?: boolean
}

/** Telemetry ring: gradient stroke, round caps, soft glow and a spring-driven arc. */
export function Ring({ size, stroke, value, color = '#10B981', gradient, track = 'rgba(255,255,255,0.065)', children, glow = true }: RingProps) {
  const id = useId().replace(/:/g, '')
  const r = (size - stroke) / 2
  const c = size / 2
  const glowColor = gradient ? gradient[1] : color
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90 overflow-visible">
        {gradient && (
          <defs>
            <linearGradient id={`rg-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={gradient[0]} />
              <stop offset="100%" stopColor={gradient[1]} />
            </linearGradient>
          </defs>
        )}
        <circle cx={c} cy={c} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <motion.circle
          cx={c}
          cy={c}
          r={r}
          fill="none"
          stroke={gradient ? `url(#rg-${id})` : color}
          strokeWidth={stroke}
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: clamp(value, 0, 1), opacity: value > 0.004 ? 1 : 0 }}
          transition={{ type: 'spring', stiffness: 60, damping: 16, mass: 0.9 }}
          style={glow ? { filter: `drop-shadow(0 0 ${Math.max(4, stroke * 0.55)}px ${glowColor}99)` } : undefined}
        />
      </svg>
      {children && <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>}
    </div>
  )
}

/** Integer that glides to its new value with spring physics. */
export function SpringNumber({ value, className, format = fmt }: { value: number; className?: string; format?: (n: number) => string }) {
  const mv = useSpring(value, { stiffness: 90, damping: 18, mass: 0.8 })
  const [text, setText] = useState(() => format(value))
  useEffect(() => {
    mv.set(value)
  }, [value, mv])
  useMotionValueEvent(mv, 'change', (v) => setText(format(v)))
  return <span className={className}>{text}</span>
}
