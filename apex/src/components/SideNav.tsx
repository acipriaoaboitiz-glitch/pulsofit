import { motion } from 'framer-motion'
import { Cloud, CloudOff, Dumbbell, Home, LineChart, Plus, Salad, UserRound } from 'lucide-react'
import type { ComponentType } from 'react'
import { useUI } from '../lib/ui'
import type { Tab } from '../lib/ui'
import { useAuth } from '../lib/auth'
import { cn, haptic } from '../lib/utils'

const TABS: { id: Tab; label: string; icon: ComponentType<{ size?: number; strokeWidth?: number }> }[] = [
  { id: 'hoy', label: 'Hoy', icon: Home },
  { id: 'nutricion', label: 'Nutrición', icon: Salad },
  { id: 'gimnasio', label: 'Gimnasio', icon: Dumbbell },
  { id: 'actividad', label: 'Progreso', icon: LineChart },
]

/** Barra lateral de escritorio (≥1024 px). En móvil se usa la barra inferior. */
export function SideNav() {
  const { tab, setTab, sheet, open, close } = useUI()
  const auth = useAuth()
  const quickOpen = sheet?.name === 'quick'

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[248px] flex-col border-r border-line bg-[#0a0d14]/95 px-4 pb-5 pt-6 lg:flex" aria-label="Navegación principal">
      <div className="mb-7 flex items-center gap-3 px-2">
        <svg viewBox="0 0 512 512" width="34" height="34" aria-hidden>
          <rect width="512" height="512" rx="112" fill="#0F131C" />
          <polyline points="86,256 186,256 226,160 284,360 322,256 426,256" fill="none" stroke="#10B981" strokeWidth="34" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="text-[22px] font-extrabold tracking-[0.12em]">PULSO</span>
      </div>

      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={() => {
          haptic(12)
          if (quickOpen) close()
          else open('quick')
        }}
        aria-label={quickOpen ? 'Cerrar acciones rápidas' : 'Acciones rápidas'}
        className="btn-primary mb-5 w-full"
      >
        <motion.span animate={{ rotate: quickOpen ? 135 : 0 }} className="grid place-items-center">
          <Plus size={20} strokeWidth={3} />
        </motion.span>
        Registrar
      </motion.button>

      <nav className="flex flex-col gap-1">
        {TABS.map((t) => {
          const on = tab === t.id
          const Icon = t.icon
          return (
            <button
              key={t.id}
              onClick={() => {
                haptic(6)
                setTab(t.id)
              }}
              aria-current={on ? 'page' : undefined}
              className={cn('relative flex items-center gap-3 rounded-2xl px-3.5 py-3 text-left text-[14.5px] font-bold transition-colors', on ? 'text-white' : 'text-white/50 hover:bg-white/[0.04] hover:text-white/80')}
            >
              {on && <motion.span layoutId="side-pill" className="absolute inset-0 rounded-2xl bg-white/[0.07]" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
              <span className={cn('relative', on && 'text-emerald')}>
                <Icon size={20} strokeWidth={on ? 2.5 : 2} />
              </span>
              <span className="relative">{t.label}</span>
            </button>
          )
        })}
      </nav>

      <div className="mt-auto">
        <button
          onClick={() => open('profile')}
          className="flex w-full items-center gap-3 rounded-2xl border border-line bg-card px-3 py-3 text-left transition hover:border-white/15"
        >
          <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-full', auth.session ? 'bg-emerald/15 text-emerald' : 'bg-white/[0.06] text-white/60')}>
            <UserRound size={18} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-bold">{auth.session ? auth.email : 'Modo local'}</span>
            <span className={cn('flex items-center gap-1 text-[11px]', auth.session ? 'text-emerald' : 'text-white/45')}>
              {auth.session ? <Cloud size={11} /> : <CloudOff size={11} />}
              {auth.session ? (auth.status === 'syncing' ? 'Sincronizando…' : 'Sincronizado') : 'Solo en este dispositivo'}
            </span>
          </span>
        </button>
      </div>
    </aside>
  )
}
