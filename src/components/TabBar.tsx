import { motion } from 'framer-motion'
import { Dumbbell, Home, Plus, Salad, UserRound } from 'lucide-react'
import type { ComponentType } from 'react'
import { useUI } from '../lib/ui'
import type { Tab } from '../lib/ui'
import { cn } from '../lib/utils'

type Item = { id: Tab | 'perfil'; label: string; icon: ComponentType<{ size?: number; strokeWidth?: number }> }

const TABS: Item[] = [
  { id: 'hoy', label: 'Hoy', icon: Home },
  { id: 'nutricion', label: 'Nutrición', icon: Salad },
  { id: 'gimnasio', label: 'Gimnasio', icon: Dumbbell },
  { id: 'perfil', label: 'Perfil', icon: UserRound },
]

/** Floating iOS-style dock (phones): 4 tabs with a sliding indicator + raised central «+». */
export function TabBar() {
  const { tab, setTab, sheet, open, close } = useUI()
  const quickOpen = sheet?.name === 'quick'
  const profileOpen = sheet?.name === 'profile'
  const current: Item['id'] = profileOpen ? 'perfil' : tab

  const item = (t: Item) => {
    const on = current === t.id
    const Icon = t.icon
    return (
      <motion.button
        key={t.id}
        whileTap={{ scale: 0.96 }}
        onClick={() => {
          navigator.vibrate?.(15)
          if (t.id === 'perfil') {
            open('profile')
            return
          }
          if (profileOpen || quickOpen) close()
          setTab(t.id)
        }}
        className="relative flex min-h-[56px] flex-1 flex-col items-center justify-center gap-1 py-2"
        aria-label={t.label}
        aria-current={on ? 'page' : undefined}
      >
        {on && <motion.span layoutId="tab-pill" className="absolute inset-x-1.5 inset-y-1 rounded-2xl bg-white/[0.07]" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
        <span className={cn('relative transition-colors', on ? 'text-emerald' : 'text-white/45')}>
          <Icon size={22} strokeWidth={on ? 2.5 : 2} />
        </span>
        <span className={cn('relative text-[10.5px] font-bold', on ? 'text-white' : 'text-white/40')}>{t.label}</span>
      </motion.button>
    )
  }

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 pb-[calc(env(safe-area-inset-bottom)+10px)] lg:hidden" aria-label="Navegación principal">
      <div className="relative flex w-full max-w-[480px] items-stretch rounded-[30px] border border-white/[0.09] bg-[#0B0F17]/90 px-1.5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.14),0_24px_50px_-12px_rgba(0,0,0,0.85)] backdrop-blur-2xl">
        {item(TABS[0])}
        {item(TABS[1])}
        <div className="w-[84px] shrink-0" />
        {item(TABS[2])}
        {item(TABS[3])}

        <div className="absolute left-1/2 top-0 z-50 -translate-x-1/2 -translate-y-[38%]">
          <motion.button
            aria-label={quickOpen ? 'Cerrar acciones rápidas' : 'Acciones rápidas'}
            onClick={() => {
              navigator.vibrate?.(15)
              if (quickOpen) close()
              else open('quick')
            }}
            style={{ backgroundImage: 'linear-gradient(135deg, #10B981 10%, #06B6D4 95%)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.4), 0 10px 36px -4px rgba(16,185,129,0.85), 0 0 30px -4px rgba(6,182,212,0.6)' }}
            whileTap={{ scale: 0.94 }}
            animate={{ rotate: quickOpen ? 135 : 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 22 }}
            className="grid h-[62px] w-[62px] place-items-center rounded-full text-[#03130d] ring-4 ring-[#04060A]"
          >
            <Plus size={30} strokeWidth={3} />
          </motion.button>
        </div>
      </div>
    </nav>
  )
}
