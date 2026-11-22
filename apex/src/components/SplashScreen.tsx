import { useEffect, useId, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'

/** Total on-screen time (visible + exit fade) in ms. */
const TOTAL_MS = 1700
const EXIT_S = 0.25
const ECG = '86,256 186,256 226,160 284,360 322,256 426,256'

/**
 * PULSO splash, shown on every launch (web and installed PWA) for 1.7 s. Tap to skip.
 * Emerald radial burst (spring) → shield ring + ECG/dumbbell line drawn with pathLength → wordmark.
 * Exit: opacity 0 + scale 1.04.
 */
export function SplashScreen({ onDone }: { onDone: () => void }) {
  const reduce = useReducedMotion()
  const id = useId().replace(/:/g, '')
  const [leaving, setLeaving] = useState(false)
  const done = useRef(false)

  useEffect(() => {
    const t = window.setTimeout(() => setLeaving(true), reduce ? 500 : TOTAL_MS - EXIT_S * 1000)
    return () => window.clearTimeout(t)
  }, [reduce])

  const finish = () => {
    if (done.current) return
    done.current = true
    onDone()
  }

  const spring = reduce ? { duration: 0 } : { type: 'spring' as const, stiffness: 120, damping: 17, mass: 0.9 }
  const draw = (delay: number, duration: number) => (reduce ? { duration: 0 } : { delay, duration, ease: [0.65, 0, 0.35, 1] as const })

  return (
    <AnimatePresence onExitComplete={finish}>
      {!leaving && (
        <motion.div
          key="splash"
          role="presentation"
          onClick={() => setLeaving(true)}
          className="fixed inset-0 z-[10000] flex cursor-pointer flex-col items-center justify-center overflow-hidden bg-[#05070B]"
          exit={{ opacity: 0, scale: 1.04 }}
          transition={{ duration: EXIT_S, ease: [0.4, 0, 0.2, 1] }}
        >
          {/* emerald radial burst from the centre */}
          <motion.div
            aria-hidden
            className="absolute left-1/2 top-1/2 h-[140vmax] w-[140vmax] -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.34) 0%, rgba(16,185,129,0.14) 22%, rgba(16,185,129,0.04) 40%, transparent 58%)' }}
            initial={{ scale: 0, opacity: 0.95 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={spring}
          />
          {/* shock ring */}
          <motion.span
            aria-hidden
            className="absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-emerald/60"
            initial={{ scale: 0.4, opacity: 0.9 }}
            animate={{ scale: reduce ? 0.4 : 5, opacity: 0 }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
          />

          {/* logo */}
          <motion.svg
            viewBox="0 0 512 512"
            width="156"
            height="156"
            className="relative overflow-visible"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={spring}
            role="img"
            aria-label="PULSO"
          >
            <defs>
              <linearGradient id={`sg-${id}`} x1="0" y1="1" x2="1" y2="0">
                <stop offset="0%" stopColor="#10B981" />
                <stop offset="100%" stopColor="#34D399" />
              </linearGradient>
              <filter id={`sb-${id}`} x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="12" />
              </filter>
            </defs>
            <circle cx="256" cy="256" r="196" fill="#0a1411" />
            <motion.circle cx="256" cy="256" r="196" fill="none" stroke="#10B981" strokeOpacity="0.55" strokeWidth="14" strokeLinecap="round" style={{ rotate: -90, transformOrigin: '256px 256px' }} initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={draw(0.05, 0.7)} />
            {/* dumbbell plates at both ends of the pulse */}
            {[
              { x: 62, d: 0.55 },
              { x: 428, d: 0.9 },
            ].map((p) => (
              <motion.g key={p.x} initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={reduce ? { duration: 0 } : { delay: p.d, duration: 0.3 }} style={{ transformOrigin: `${p.x + 11}px 256px` }}>
                <rect x={p.x} y="214" width="22" height="84" rx="9" fill="#10B981" />
                <rect x={p.x + (p.x < 256 ? 28 : -18)} y="228" width="12" height="56" rx="6" fill="#10B981" fillOpacity="0.7" />
              </motion.g>
            ))}
            <motion.polyline points={ECG} fill="none" stroke={`url(#sg-${id})`} strokeWidth="40" strokeLinecap="round" strokeLinejoin="round" filter={`url(#sb-${id})`} initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 0.7 }} transition={draw(0.3, 0.75)} />
            <motion.polyline points={ECG} fill="none" stroke={`url(#sg-${id})`} strokeWidth="26" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={draw(0.3, 0.75)} />
          </motion.svg>

          {/* wordmark */}
          <motion.h1
            className="mt-8 text-[44px] font-extrabold leading-none"
            style={{ letterSpacing: '0.3em', paddingLeft: '0.3em', backgroundImage: 'linear-gradient(180deg,#ffffff 30%,#a7c4bb)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}
            initial={{ opacity: 0, y: 14, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={reduce ? { duration: 0 } : { delay: 0.55, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            PULSO
          </motion.h1>
          <motion.p
            className="mt-3.5 text-[10px] font-semibold uppercase tracking-[0.34em] text-emerald/70"
            style={{ paddingLeft: '0.34em' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={reduce ? { duration: 0 } : { delay: 0.85, duration: 0.4 }}
          >
            Entreno · Nutrición · Pasos
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
