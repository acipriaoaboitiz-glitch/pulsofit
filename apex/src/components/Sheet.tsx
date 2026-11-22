import { AnimatePresence, motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '../lib/utils'

interface SheetProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  /** take the full screen height */
  full?: boolean
  z?: number
}

export function Sheet({ open, onClose, title, children, full, z = 50 }: SheetProps) {
  const desktop = typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 flex items-end justify-center lg:items-center" style={{ zIndex: z }}>
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            className={cn(
              'relative flex w-full max-w-[520px] flex-col rounded-t-[32px] border border-b-0 border-line bg-[#0d1017] shadow-2xl lg:max-w-[600px] lg:rounded-[28px] lg:border-b',
              full ? 'h-[94dvh] lg:h-[86dvh]' : 'max-h-[90dvh] lg:max-h-[86dvh]',
            )}
            initial={desktop ? { y: 24, opacity: 0, scale: 0.97 } : { y: '100%' }}
            animate={desktop ? { y: 0, opacity: 1, scale: 1 } : { y: 0 }}
            exit={desktop ? { y: 16, opacity: 0, scale: 0.98 } : { y: '100%' }}
            transition={{ type: 'spring', stiffness: 340, damping: 34 }}
          >
            <div className="flex items-center justify-between px-5 pb-2 pt-3">
              <div className="absolute left-1/2 top-2 h-1 w-10 -translate-x-1/2 rounded-full bg-white/20 lg:hidden" />
              <h2 className="pt-3 text-lg font-extrabold tracking-tight">{title}</h2>
              <button
                onClick={onClose}
                aria-label="Cerrar"
                className="mt-3 grid h-9 w-9 place-items-center rounded-full bg-white/[0.06] text-white/70 active:scale-90"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-[calc(24px+var(--safe-bottom))] pt-2">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
