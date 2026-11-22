import { useEffect, useId, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'

/** Total on-screen time in ms: 1.55 s of cinematic + 0.25 s fade-out. */
const TOTAL_MS = 1800
const EXIT_S = 0.25
const ECG = '124,262 198,262 234,176 290,354 324,262 388,262'
const SHIELD = 'M256 38 L442 108 V262 C442 372 362 452 256 484 C150 452 70 372 70 262 V108 Z'
const SHIELD_IN = 'M256 70 L412 128 V260 C412 352 346 420 256 448 C166 420 100 352 100 260 V128 Z'

/**
 * PULSO splash — plays on EVERY open (web and installed PWA), 1.8 s, tap to skip.
 *  0.00 s  deep black + emerald radial shock-waves from the centre
 *  0.25 s  logo bounces in (spring 380/22): bevelled metallic shield + live heartbeat/dumbbell line
 *  0.55 s  “PULSO” (Plus Jakarta Sans ExtraBold, tracking .22em) with a diagonal light sweep + loading bar
 *  1.55 s  fade to the app: scale 1.05, opacity 0, blur 8px
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

  const bounce = reduce ? { duration: 0 } : { type: 'spring' as const, stiffness: 380, damping: 22, delay: 0.25 }
  const draw = (delay: number, duration: number) => (reduce ? { duration: 0 } : { delay, duration, ease: [0.65, 0, 0.35, 1] as const })

  return (
    <AnimatePresence onExitComplete={finish}>
      {!leaving && (
        <motion.div
          key="splash"
          role="presentation"
          onClick={() => setLeaving(true)}
          className="fixed inset-0 z-[10000] flex cursor-pointer flex-col items-center justify-center overflow-hidden bg-[#030508]"
          exit={{ opacity: 0, scale: 1.05, filter: 'blur(8px)' }}
          transition={{ duration: EXIT_S, ease: [0.4, 0, 0.2, 1] }}
        >
          {/* emerald glow filling the screen from the centre */}
          <motion.div
            aria-hidden
            className="absolute left-1/2 top-1/2 h-[150vmax] w-[150vmax] -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.42) 0%, rgba(16,185,129,0.16) 20%, rgba(16,185,129,0.05) 38%, transparent 56%)' }}
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 90, damping: 18 }}
          />
          {/* radial shock-waves */}
          {[0, 0.16, 0.34].map((d, i) => (
            <motion.span
              key={d}
              aria-hidden
              className="absolute left-1/2 top-1/2 h-44 w-44 -translate-x-1/2 -translate-y-1/2 rounded-full border-2"
              style={{ borderColor: i === 1 ? 'rgba(52,211,153,0.5)' : 'rgba(16,185,129,0.6)' }}
              initial={{ scale: 0.3, opacity: 0.95 }}
              animate={{ scale: reduce ? 0.3 : 7, opacity: 0 }}
              transition={{ duration: 1.1, delay: d, ease: 'easeOut' }}
            />
          ))}

          {/* logo: bevelled metallic shield + heartbeat / dumbbell */}
          <motion.svg
            viewBox="0 0 512 512"
            width="168"
            height="168"
            className="relative overflow-visible"
            style={{ filter: 'drop-shadow(0 0 30px rgba(16,185,129,0.8))' }}
            initial={{ scale: 0.35, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={bounce}
            role="img"
            aria-label="PULSO"
          >
            <defs>
              <linearGradient id={`m-${id}`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#A7F3D0" />
                <stop offset="35%" stopColor="#10B981" />
                <stop offset="70%" stopColor="#047857" />
                <stop offset="100%" stopColor="#34D399" />
              </linearGradient>
              <linearGradient id={`i-${id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0B1F18" />
                <stop offset="100%" stopColor="#04100C" />
              </linearGradient>
              <linearGradient id={`l-${id}`} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#34D399" />
                <stop offset="100%" stopColor="#6EE7B7" />
              </linearGradient>
              <filter id={`g-${id}`} x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="10" />
              </filter>
            </defs>
            <path d={SHIELD} fill={`url(#m-${id})`} />
            <path d={SHIELD_IN} fill={`url(#i-${id})`} />
            <path d={SHIELD} fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="3" />
            {/* dumbbell plates */}
            {[
              { x: 108, d: 0.7 },
              { x: 392, d: 0.95 },
            ].map((p) => (
              <motion.g key={p.x} initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={reduce ? { duration: 0 } : { delay: p.d, duration: 0.25 }} style={{ transformOrigin: `${p.x + 6}px 262px` }}>
                <rect x={p.x} y="226" width="14" height="72" rx="6" fill="#10B981" />
                <rect x={p.x + (p.x < 256 ? 18 : -10)} y="238" width="8" height="48" rx="4" fill="#10B981" fillOpacity="0.65" />
              </motion.g>
            ))}
            <motion.polyline points={ECG} fill="none" stroke={`url(#l-${id})`} strokeWidth="34" strokeLinecap="round" strokeLinejoin="round" filter={`url(#g-${id})`} initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 0.75 }} transition={draw(0.4, 0.7)} />
            <motion.polyline points={ECG} fill="none" stroke={`url(#l-${id})`} strokeWidth="22" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={draw(0.4, 0.7)} />
          </motion.svg>

          {/* wordmark with a diagonal light sweep */}
          <motion.div className="relative mt-9 overflow-hidden" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={reduce ? { duration: 0 } : { delay: 0.55, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}>
            <h1 className="pl-[0.22em] text-[46px] font-extrabold leading-none tracking-[0.22em]" style={{ backgroundImage: 'linear-gradient(180deg,#ffffff 30%,#a7c4bb)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
              PULSO
            </h1>
            {!reduce && (
              <motion.span
                aria-hidden
                className="absolute inset-y-0 w-[36%]"
                style={{ background: 'linear-gradient(100deg, transparent 20%, rgba(255,255,255,0.85) 50%, transparent 80%)', mixBlendMode: 'overlay' }}
                initial={{ left: '-45%' }}
                animate={{ left: '120%' }}
                transition={{ delay: 0.8, duration: 0.6, ease: 'easeInOut' }}
              />
            )}
          </motion.div>
          <motion.p className="mt-3.5 pl-[0.34em] text-[10px] font-semibold uppercase tracking-[0.34em] text-emerald/70" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={reduce ? { duration: 0 } : { delay: 0.85, duration: 0.4 }}>
            Entreno · Nutrición · Pasos
          </motion.p>

          {/* minimal loading bar */}
          <div className="absolute inset-x-12 bottom-[calc(40px+var(--safe-bottom))] mx-auto h-[3px] max-w-[260px] overflow-hidden rounded-full bg-white/[0.08]">
            <motion.div className="h-full origin-left rounded-full" style={{ background: 'linear-gradient(90deg,#10B981,#6EE7B7)', boxShadow: '0 0 14px rgba(16,185,129,0.9)' }} initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={reduce ? { duration: 0 } : { duration: TOTAL_MS / 1000 - EXIT_S, ease: 'linear' }} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
