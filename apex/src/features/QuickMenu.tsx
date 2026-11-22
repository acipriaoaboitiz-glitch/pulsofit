import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Camera, Check, Droplets, Dumbbell, Footprints, ScanBarcode } from 'lucide-react'
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
  { id: 'scan', label: 'Escanear código', color: '#10B981', fg: '#04130d', icon: ScanBarcode },
  { id: 'photo', label: 'Foto al plato IA', color: '#8B5CF6', fg: '#fff', icon: Camera },
  { id: 'water', label: '+250 ml agua', color: '#06B6D4', fg: '#021a1f', icon: Droplets },
  { id: 'steps', label: 'Pasos / Cardio', color: '#F97316', fg: '#1c1200', icon: Footprints },
  { id: 'exercise', label: 'Añadir ejercicio hoy', color: '#A78BFA', fg: '#150a3a', icon: Dumbbell },
]

const ANGLES = [-158, -124, -90, -56, -22]
const RADIUS = 140

export function QuickMenu() {
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
    open(id === 'exercise' ? 'addExercise' : id === 'steps' ? 'activity' : (id as 'scan' | 'photo'))
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="backdrop"
            className="fixed inset-0 z-[30] bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
          />
          <div
            key="fan"
            className="pointer-events-none fixed left-1/2 z-[35] h-0 w-0"
            style={{ bottom: 'calc(98px + var(--safe-bottom))' }}
          >
            {ITEMS.map((it, i) => {
              const a = (ANGLES[i] * Math.PI) / 180
              const x = Math.cos(a) * RADIUS
              const y = Math.sin(a) * RADIUS
              const Icon = it.id === 'water' && watered ? Check : it.icon
              return (
                <motion.button
                  key={it.id}
                  onClick={() => run(it.id)}
                  initial={{ x: 0, y: 0, scale: 0.2, opacity: 0 }}
                  animate={{ x, y, scale: 1, opacity: 1 }}
                  exit={{ x: 0, y: 0, scale: 0.2, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 380, damping: 22, delay: i * 0.035 }}
                  className="pointer-events-auto absolute -ml-[30px] -mt-[30px] flex w-[60px] flex-col items-center"
                  aria-label={it.label}
                >
                  <span
                    className="relative grid h-[60px] w-[60px] place-items-center rounded-full shadow-[0_10px_30px_-6px_rgba(0,0,0,0.8)] active:scale-90"
                    style={{ background: it.color, color: it.fg, boxShadow: `0 10px 30px -8px ${it.color}` }}
                  >
                    <Icon size={26} strokeWidth={2.4} />
                    {it.id === 'photo' && (
                      <span className="num absolute -right-1 -top-1 rounded-full bg-[#0d1017] px-1.5 py-0.5 text-[10px] font-bold text-neon ring-1 ring-neon/50">
                        {aiRemaining}/3
                      </span>
                    )}
                  </span>
                  <span className="mt-1.5 w-[76px] text-center text-[11px] font-bold leading-tight text-white">
                    {it.id === 'water' && watered ? '¡Añadido!' : it.label}
                  </span>
                </motion.button>
              )
            })}
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
