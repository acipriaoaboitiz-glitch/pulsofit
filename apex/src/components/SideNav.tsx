import { motion } from 'framer-motion'
import { Cloud, CloudOff, Dumbbell, Home, LineChart, Loader2, Plus, Salad, UserRound } from 'lucide-react'
import type { ComponentType } from 'react'
import { useUI } from '../lib/ui'
import type { Tab } from '../lib/ui'
import { useAuth } from '../lib/auth'
import { useStore } from '../lib/store'
import { cn, haptic } from '../lib/utils'

type Item = { id: Tab | 'perfil'; label: string; icon: ComponentType<{ size?: number; strokeWidth?: number }> }

const TABS: Item[] = [
  { id: 'hoy', label: 'Hoy', icon: Home },
  { id: 'nutricion', label: 'Nutrición', icon: Salad },
  { id: 'gimnasio', label: 'Gimnasio', icon: Dumbbell },
  { id: 'actividad', label: 'Progreso', icon: LineChart },
  { id: 'perfil', label: 'Perfil y Cuenta', icon: UserRound },
]

/** Logo mark: the pulse line beats with an emerald glow. */
function PulseLogo() {
  return (
    <span className="relative grid h-10 w-10 place-items-center">
      <motion.span aria-hidden className="absolute inset-0 rounded-[14px] bg-emerald/40 blur-md" animate={{ opacity: [0.25, 0.6, 0.25], scale: [0.9, 1.08, 0.9] }} transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }} />
      <svg viewBox="0 0 512 512" width="40" height="40" aria-hidden className="relative">
        <rect width="512" height="512" rx="120" fill="#0A1411" stroke="#10B981" strokeOpacity="0.35" strokeWidth="14" />
        <motion.polyline
          points="86,256 186,256 226,160 284,360 322,256 426,256"
          fill="none"
          stroke="#10B981"
          strokeWidth="36"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ filter: 'drop-shadow(0 0 10px rgba(16,185,129,0.9))' }}
          animate={{ opacity: [0.75, 1, 0.75] }}
          transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
        />
      </svg>
    </span>
  )
}

/** Barra lateral fija de escritorio (≥1024 px, w-64). En móvil se usa la barra inferior flotante. */
export function SideNav() {
  const { tab, setTab, sheet, open, close } = useUI()
  const { streak } = useStore()
  const auth = useAuth()
  const quickOpen = sheet?.name === 'quick'
  const profileOpen = sheet?.name === 'profile'
  const current: Item['id'] = profileOpen ? 'perfil' : tab

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-white/[0.06] bg-[#070A10]/90 px-4 pb-5 pt-6 backdrop-blur-2xl lg:flex" aria-label="Navegación principal">
      <div className="mb-7 flex items-center gap-3 px-2">
        <PulseLogo />
        <span className="text-[22px] font-extrabold tracking-[0.18em]">PULSO</span>
      </div>

      <motion.button
        whileTap={{ scale: 0.96 }}
        onClick={() => {
          navigator.vibrate?.(15)
          if (quickOpen) close()
          else open('quick')
        }}
        aria-label={quickOpen ? 'Cerrar acciones rápidas' : 'Acción rápida'}
        className="btn-primary mb-6 w-full"
      >
        <motion.span animate={{ rotate: quickOpen ? 135 : 0 }} transition={{ type: 'spring', stiffness: 380, damping: 22 }} className="grid place-items-center">
          <Plus size={20} strokeWidth={3} />
        </motion.span>
        Acción Rápida
      </motion.button>

      <nav className="flex flex-col gap-1">
        {TABS.map((t) => {
          const on = current === t.id
          const Icon = t.icon
          return (
            <motion.button
              key={t.id}
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                haptic(6)
                if (t.id === 'perfil') open('profile')
                else {
                  if (profileOpen) close()
                  setTab(t.id)
                }
              }}
              aria-current={on ? 'page' : undefined}
              className={cn('relative flex items-center gap-3 rounded-2xl px-3.5 py-3 text-left text-[14.5px] font-bold transition-colors', on ? 'text-white' : 'text-white/50 hover:bg-white/[0.04] hover:text-white/80', t.id === 'perfil' && 'mt-3')}
            >
              {on && <motion.span layoutId="side-pill" className="absolute inset-0 rounded-2xl border border-white/[0.08] bg-white/[0.07]" style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1)' }} transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
              {on && <motion.span layoutId="side-bar" className="absolute inset-y-2.5 left-0 w-[3px] rounded-r-full bg-emerald" style={{ boxShadow: '0 0 12px #10B981' }} transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
              <span className={cn('relative', on && 'text-emerald')}>
                <Icon size={20} strokeWidth={on ? 2.5 : 2} />
              </span>
              <span className="relative">{t.label}</span>
            </motion.button>
          )
        })}
      </nav>

      <div className="mt-auto space-y-2.5">
        <div className="flex items-center justify-between rounded-2xl border border-fire/20 bg-fire/[0.07] px-3.5 py-3">
          <span className="flex items-center gap-2 text-[13px] font-bold text-fire">
            <motion.span animate={{ scale: [1, 1.18, 0.96, 1.1, 1] }} transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }} className="text-[17px] leading-none" style={{ filter: 'drop-shadow(0 0 6px rgba(249,115,22,0.7))' }}>
              🔥
            </motion.span>
            Racha activa
          </span>
          <span className="num text-[14px] font-bold text-white">
            {streak} {streak === 1 ? 'día' : 'días'}
          </span>
        </div>

        <button onClick={() => open('profile')} className="flex w-full items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.03] px-3.5 py-3 text-left transition hover:border-white/15" aria-label="Estado de sincronización">
          <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-full', auth.session ? 'bg-emerald/15 text-emerald' : 'bg-white/[0.06] text-white/50')}>
            {auth.status === 'syncing' ? <Loader2 size={17} className="animate-spin" /> : auth.session ? <Cloud size={17} /> : <CloudOff size={17} />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[12.5px] font-bold">{auth.session ? 'Sincronizado · PC y Móvil' : 'Sin sincronizar'}</span>
            <span className={cn('block truncate text-[11px]', auth.status === 'error' ? 'text-fire' : auth.session ? 'text-emerald' : 'text-white/40')}>
              {auth.status === 'syncing' ? 'Sincronizando…' : auth.status === 'error' ? 'Error al sincronizar' : auth.session ? auth.email : 'Inicia sesión en tu perfil'}
            </span>
          </span>
        </button>
      </div>
    </aside>
  )
}
