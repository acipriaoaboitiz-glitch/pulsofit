import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Camera, Check, Droplets, Footprints, ScanBarcode, Sparkles, TrendingUp } from 'lucide-react'
import type { ComponentType } from 'react'
import { useUI } from '../lib/ui'
import { useStore } from '../lib/store'
import { haptic } from '../lib/utils'

interface Item {
  id: string
  label: string
  color: string
  fg: string
  icon: ComponentType<{ size?: number; strokeWidth?: number }>
}

const ITEMS: Item[] = [
  { id: 'magic', label: 'Barra Mágica (texto o voz)', color: '#A78BFA', fg: '#150a3a', icon: Sparkles },
  { id: 'scan', label: 'Escanear código', color: '#10B981', fg: '#04130d', icon: ScanBarcode },
  { id: 'photo', label: 'Foto al plato IA', color: '#8B5CF6', fg: '#fff', icon: Camera },
  { id: 'water', label: '+250 ml agua', color: '#06B6D4', fg: '#021a1f', icon: Droplets },
  { id: 'treadmill', label: 'Cardio · Cinta 15%', color: '#FB923C', fg: '#1c0b00', icon: TrendingUp },
  { id: 'steps', label: 'Pasos y actividad', color: '#F97316', fg: '#1c1200', icon: Footprints },
]

/** true on desktop (≥1024 px), where the + menu becomes a vertical popover next to the side navigation */
function useDesktop(): boolean {
  const q = '(min-width: 1024px)'
  const [d, setD] = useState(() => typeof window !== 'undefined' && window.matchMedia(q).matches)
  useEffect(() => {
    const m = window.matchMedia(q)
    const on = (): void => setD(m.matches)
    m.addEventListener('change', on)
    return () => m.removeEventListener('change', on)
  }, [])
  return d
}

export function QuickMenu() {
  const desktop = useDesktop()
  const { sheet, open, close } = useUI()
  const { addWater, aiRemaining } = useStore()
  const isOpen = sheet?.name === 'quick'
  const [watered, setWatered] = useState(false)

  useEffect(() => {
    if (!watered) return
    const t = window.setTimeout(() => setWatered(false), 1300)
    return () => window.clearTimeout(t)
  }, [watered])

  const run = (id: string) => {
    haptic(15)
    if (id === 'water') {
      addWater(250)
      setWatered(true)
      return
    }
    open(id === 'magic' ? 'magic' : id === 'steps' ? 'activity' : (id as 'scan' | 'photo' | 'treadmill'))
  }

  if (desktop) {
    return (
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div key="backdrop" className="fixed inset-0 z-[30] bg-black/60" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={close} />
            <motion.div
              key="list"
              role="menu"
              aria-label="Acciones rápidas"
              initial={{ opacity: 0, x: -10, scale: 0.97 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ type: 'spring', stiffness: 420, damping: 30 }}
              className="fixed left-[268px] top-[84px] z-[45] w-[270px] rounded-2xl border border-line bg-[#0f131c] p-1.5 shadow-2xl"
            >
              {ITEMS.map((it) => {
                const Icon = it.id === 'water' && watered ? Check : it.icon
                return (
                  <button key={it.id} role="menuitem" onClick={() => run(it.id)} className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition-colors hover:bg-white/[0.06]">
                    <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-xl" style={{ background: it.color, color: it.fg }}>
                      <Icon size={20} strokeWidth={2.4} />
                    </span>
                    <span className="flex-1 text-[14px] font-bold">{it.id === 'water' && watered ? '¡Añadido!' : it.label}</span>
                    {it.id === 'photo' && <span className="num rounded-full bg-neon/20 px-2 py-0.5 text-[11px] font-bold text-violet-200">{aiRemaining}/3</span>}
                  </button>
                )
              })}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    )
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div key="backdrop" className="fixed inset-0 z-[30] bg-black/70 backdrop-blur-md" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={close} />
          <motion.div
            key="grid"
            role="menu"
            aria-label="Acciones rápidas"
            initial={{ y: 40, opacity: 0, scale: 0.92 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 30, opacity: 0, scale: 0.94 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="card fixed left-1/2 z-[35] w-[min(92vw,420px)] -translate-x-1/2 p-3"
            style={{ bottom: 'calc(104px + var(--safe-bottom))', transformOrigin: '50% 100%' }}
          >
            <div className="grid grid-cols-6 gap-2.5">
              {ITEMS.map((it, i) => {
                const Icon = it.id === 'water' && watered ? Check : it.icon
                return (
                  <motion.button
                    key={it.id}
                    role="menuitem"
                    onClick={() => run(it.id)}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: 'spring', damping: 24, stiffness: 340, delay: 0.04 + i * 0.04 }}
                    whileTap={{ scale: 0.94 }}
                    aria-label={it.label}
                    className={`relative flex flex-col items-center gap-2 rounded-2xl border border-white/[0.07] bg-white/[0.04] px-1.5 py-3.5 col-span-2`}
                    style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)' }}
                  >
                    <span className="grid h-12 w-12 place-items-center rounded-2xl" style={{ background: `linear-gradient(145deg, ${it.color}, ${it.color}bb)`, color: it.fg, boxShadow: `0 10px 24px -8px ${it.color}` }}>
                      <Icon size={24} strokeWidth={2.3} />
                    </span>
                    <span className="text-center text-[11px] font-bold leading-tight">{it.id === 'water' && watered ? '¡Añadido!' : it.label}</span>
                    {it.id === 'photo' && <span className="num absolute right-1.5 top-1.5 rounded-full bg-neon/25 px-1.5 py-0.5 text-[9px] font-bold text-violet-200">{aiRemaining}/3</span>}
                  </motion.button>
                )
              })}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
