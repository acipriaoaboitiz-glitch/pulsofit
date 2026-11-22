import { motion } from 'framer-motion'
import { Activity, Dumbbell, Home, Plus, Salad } from 'lucide-react'
import type { ComponentType } from 'react'
import { useUI } from '../lib/ui'
import type { Tab } from '../lib/ui'
import { cn, haptic } from '../lib/utils'

const TABS: { id: Tab; label: string; icon: ComponentType<{ size?: number; strokeWidth?: number }> }[] = [
  { id: 'hoy', label: 'Hoy', icon: Home },
  { id: 'nutricion', label: 'Nutrición', icon: Salad },
  { id: 'gimnasio', label: 'Gimnasio', icon: Dumbbell },
  { id: 'actividad', label: 'Actividad', icon: Activity },
]

export function TabBar() {
  const { tab, setTab, sheet, open, close } = useUI()
  const quickOpen = sheet?.name === 'quick'

  const item = (t: (typeof TABS)[number]) => {
    const on = tab === t.id
    const Icon = t.icon
    return (
      <button
        key={t.id}
        onClick={() => {
          haptic(8)
          setTab(t.id)
        }}
        className="relative flex flex-1 flex-col items-center gap-1 py-2.5"
        aria-label={t.label}
        aria-current={on ? 'page' : undefined}
      >
        {on && (
          <motion.span
            layoutId="tab-pill"
            className="absolute inset-x-2 inset-y-1 rounded-2xl bg-white/[0.07]"
            transition={{ type: 'spring', stiffness: 420, damping: 34 }}
          />
        )}
        <span className={cn('relative transition-colors', on ? 'text-emerald' : 'text-white/45')}>
          <Icon size={22} strokeWidth={on ? 2.5 : 2} />
        </span>
        <span className={cn('relative text-[10.5px] font-bold', on ? 'text-white' : 'text-white/40')}>{t.label}</span>
      </button>
    )
  }

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 lg:hidden"
      style={{ paddingBottom: 'calc(10px + var(--safe-bottom))' }}
    >
      <div className="relative flex w-full max-w-[480px] items-stretch rounded-[28px] border border-line bg-[#0d1017]/90 px-1 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.8)] backdrop-blur-xl">
        {item(TABS[0])}
        {item(TABS[1])}
        <div className="w-[92px] shrink-0" />
        {item(TABS[2])}
        {item(TABS[3])}

        <div className="absolute left-1/2 top-0 z-50 -translate-x-1/2 -translate-y-[38%]">
        <motion.button
          aria-label={quickOpen ? 'Cerrar acciones rápidas' : 'Acciones rápidas'}
          onClick={() => {
            haptic(15)
            if (quickOpen) close()
            else open('quick')
          }}
          whileTap={{ scale: 0.9 }}
          animate={{ rotate: quickOpen ? 135 : 0 }}
          transition={{ type: 'spring', stiffness: 380, damping: 22 }}
          className="grid h-[62px] w-[62px] place-items-center rounded-full bg-emerald text-[#04130d] shadow-[0_10px_34px_-4px_rgba(16,185,129,0.85)] ring-4 ring-[#07090E]"
        >
          <Plus size={30} strokeWidth={3} />
        </motion.button>
        </div>
      </div>
    </nav>
  )
}
