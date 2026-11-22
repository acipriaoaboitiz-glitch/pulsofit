import { motion } from 'framer-motion'
import { Flame, LineChart } from 'lucide-react'
import { useUI } from '../lib/ui'
import { useStore } from '../lib/store'
import { cn } from '../lib/utils'

/** Compact translucent top bar of the phone layout (the desktop uses the side navigation). */
export function MobileHeader() {
  const { tab, setTab } = useUI()
  const { streak } = useStore()
  const onProgress = tab === 'actividad'
  return (
    <header className="sticky top-0 z-30 border-b border-white/[0.05] bg-[#05070B]/80 backdrop-blur-2xl lg:hidden" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="flex h-[52px] items-center justify-between px-4">
        <div className="flex items-center gap-2.5">
          <svg viewBox="0 0 512 512" width="28" height="28" aria-hidden>
            <rect width="512" height="512" rx="120" fill="#0A1411" stroke="#10B981" strokeOpacity="0.4" strokeWidth="14" />
            <polyline points="86,256 186,256 226,160 284,360 322,256 426,256" fill="none" stroke="#10B981" strokeWidth="36" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 0 8px rgba(16,185,129,0.8))' }} />
          </svg>
          <span className="text-[17px] font-extrabold tracking-[0.18em]">PULSO</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex h-8 items-center gap-1 rounded-full border border-fire/30 bg-fire/10 px-2.5 text-[12px] font-bold text-fire">
            <Flame size={13} fill="currentColor" />
            <span className="num">{streak}</span>
          </span>
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => {
              navigator.vibrate?.(15)
              setTab('actividad')
            }}
            aria-label="Progreso"
            aria-current={onProgress ? 'page' : undefined}
            className={cn('grid h-11 w-11 place-items-center rounded-full border', onProgress ? 'border-emerald/40 bg-emerald/15 text-emerald' : 'border-white/[0.08] bg-white/[0.045] text-white/70')}
          >
            <LineChart size={19} />
          </motion.button>
        </div>
      </div>
    </header>
  )
}
