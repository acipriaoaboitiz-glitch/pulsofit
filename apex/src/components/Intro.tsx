import { useEffect, useId, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'

const LETTERS = ['A', 'P', 'E', 'X']

/**
 * Entry cinematic: the APEX mark draws itself (ring → chevron), a shock-wave pulses out,
 * the wordmark resolves letter by letter and the whole thing dissolves into the app.
 * Tap anywhere to skip. Respects prefers-reduced-motion.
 */
export function Intro({ onDone }: { onDone: () => void }) {
  const reduce = useReducedMotion()
  const id = useId().replace(/:/g, '')
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    const t = window.setTimeout(() => setLeaving(true), reduce ? 650 : 3100)
    return () => window.clearTimeout(t)
  }, [reduce])

  const draw = (delay: number, duration: number) => (reduce ? { duration: 0 } : { delay, duration, ease: [0.65, 0, 0.35, 1] as const })

  return (
    <AnimatePresence onExitComplete={onDone}>
      {!leaving && (
        <motion.div
          key="intro"
          role="presentation"
          onClick={() => setLeaving(true)}
          className="fixed inset-0 z-[10000] flex cursor-pointer flex-col items-center justify-center overflow-hidden bg-[#05070B]"
          exit={{ opacity: 0, scale: 1.08, filter: 'blur(12px)' }}
          transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
        >
          {/* ambient light */}
          <motion.div
            aria-hidden
            className="absolute left-1/2 top-1/2 h-[120vmax] w-[120vmax] -translate-x-1/2 -translate-y-1/2"
            style={{ background: 'radial-gradient(circle at 50% 50%, rgba(16,185,129,0.18), rgba(6,182,212,0.07) 28%, transparent 55%)' }}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={reduce ? { duration: 0 } : { duration: 2.2, ease: 'easeOut' }}
          />
          <motion.div
            aria-hidden
            className="absolute inset-x-0 top-1/2 h-px"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(16,185,129,0.5), rgba(6,182,212,0.5), transparent)' }}
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: [0, 1, 1], opacity: [0, 0.8, 0] }}
            transition={reduce ? { duration: 0 } : { duration: 1.6, delay: 0.2, ease: 'easeOut' }}
          />

          {/* the mark */}
          <div className="relative grid h-[168px] w-[168px] place-items-center">
            <motion.span
              aria-hidden
              className="absolute inset-0 rounded-full border-2 border-emerald/70"
              initial={{ scale: 0.7, opacity: 0 }}
              animate={reduce ? { opacity: 0 } : { scale: [0.7, 2.7], opacity: [0.9, 0] }}
              transition={{ duration: 1.2, delay: 1.55, ease: 'easeOut' }}
            />
            <motion.svg viewBox="0 0 512 512" width="168" height="168" className="overflow-visible" animate={reduce ? undefined : { scale: [1, 1, 1.06, 1] }} transition={{ duration: 3, times: [0, 0.5, 0.58, 0.7], ease: 'easeOut' }}>
              <defs>
                <linearGradient id={`ig-${id}`} x1="0" y1="1" x2="1" y2="0">
                  <stop offset="0%" stopColor="#10B981" />
                  <stop offset="100%" stopColor="#06B6D4" />
                </linearGradient>
                <filter id={`ib-${id}`} x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="14" />
                </filter>
              </defs>
              {/* glow copy of the chevron */}
              <motion.polyline
                points="112,352 256,150 400,352"
                fill="none"
                stroke={`url(#ig-${id})`}
                strokeWidth="46"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter={`url(#ib-${id})`}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.75 }}
                transition={draw(0.75, 0.9)}
              />
              <motion.circle cx="256" cy="256" r="178" fill="none" stroke="rgba(16,185,129,0.4)" strokeWidth="14" strokeLinecap="round" style={{ rotate: -90, transformOrigin: '256px 256px' }} initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={draw(0.1, 1.2)} />
              <motion.polyline
                points="112,352 256,150 400,352"
                fill="none"
                stroke={`url(#ig-${id})`}
                strokeWidth="30"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={draw(0.75, 0.9)}
              />
              {/* spark that rides the end of the stroke */}
              <motion.circle cx="400" cy="352" r="11" fill="#d1fae5" initial={{ opacity: 0, scale: 0 }} animate={{ opacity: [0, 1, 0], scale: [0, 1.6, 0] }} transition={reduce ? { duration: 0 } : { delay: 1.55, duration: 0.7 }} style={{ filter: 'drop-shadow(0 0 10px #10B981)' }} />
            </motion.svg>
          </div>

          {/* wordmark */}
          <motion.div className="mt-9 flex" initial={{ letterSpacing: '0.55em' }} animate={{ letterSpacing: '0.3em' }} transition={reduce ? { duration: 0 } : { delay: 1.3, duration: 1.4, ease: 'easeOut' }} aria-label="APEX">
            {LETTERS.map((l, i) => (
              <motion.span
                key={l}
                className="text-[46px] font-extrabold leading-none"
                style={{ backgroundImage: 'linear-gradient(180deg, #ffffff 30%, #9fb7b0)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}
                initial={{ y: 30, opacity: 0, filter: 'blur(14px)' }}
                animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
                transition={reduce ? { duration: 0 } : { delay: 1.3 + i * 0.1, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              >
                {l}
              </motion.span>
            ))}
          </motion.div>
          <motion.p className="num mt-4 text-[10px] font-semibold uppercase tracking-[0.32em] text-zinc-500" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={reduce ? { duration: 0 } : { delay: 2.1, duration: 0.7 }}>
            Entreno · Nutrición · Pasos
          </motion.p>

          {/* progress hairline */}
          <div className="absolute inset-x-10 bottom-[calc(36px+var(--safe-bottom))] h-px bg-white/[0.07]">
            <motion.div className="h-full origin-left" style={{ background: 'linear-gradient(90deg, #10B981, #06B6D4)', boxShadow: '0 0 12px rgba(16,185,129,0.8)' }} initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={reduce ? { duration: 0 } : { duration: 3, ease: 'linear' }} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
