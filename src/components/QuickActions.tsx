import { motion } from 'framer-motion'
import { Camera, ScanBarcode, Search, TrendingUp } from 'lucide-react'
import { useUI } from '../lib/ui'
import { useStore, AI_PHOTO_LIMIT } from '../lib/store'
import { haptic } from '../lib/utils'

/** Phone home: the four things you do every day, one thumb tap away. */
export function QuickActions({ date, className }: { date: string; className?: string }) {
  const ui = useUI()
  const { aiRemaining } = useStore()
  const items = [
    { id: 'scan', label: 'Escanear', icon: ScanBarcode, color: '#10B981' },
    { id: 'photo', label: 'Foto IA', icon: Camera, color: '#8B5CF6' },
    { id: 'search', label: 'Buscar', icon: Search, color: '#06B6D4' },
    { id: 'treadmill', label: 'Cinta', icon: TrendingUp, color: '#F97316' },
  ] as const
  return (
    <div className={className}>
      <div className="grid grid-cols-4 gap-2.5">
        {items.map((it, i) => (
          <motion.button
            key={it.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04, type: 'spring', damping: 24, stiffness: 320 }}
            whileTap={{ scale: 0.93 }}
            onClick={() => {
              haptic(10)
              ui.open(it.id, { date })
            }}
            aria-label={it.label}
            className="relative flex min-h-[82px] flex-col items-center justify-center gap-2 overflow-hidden rounded-[22px] border border-white/[0.08]"
            style={{ background: `linear-gradient(160deg, ${it.color}26, rgba(11,15,23,0.92) 70%)`, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12), 0 14px 30px -18px rgba(0,0,0,0.9)' }}
          >
            <span className="grid h-10 w-10 place-items-center rounded-2xl" style={{ background: `${it.color}22`, color: it.color }}>
              <it.icon size={21} strokeWidth={2.3} />
            </span>
            <span className="text-[11.5px] font-bold">{it.label}</span>
            {it.id === 'photo' && (
              <span className="num absolute right-1.5 top-1.5 text-[9px] font-bold text-violet-200/70">
                {aiRemaining}/{AI_PHOTO_LIMIT}
              </span>
            )}
          </motion.button>
        ))}
      </div>
    </div>
  )
}
