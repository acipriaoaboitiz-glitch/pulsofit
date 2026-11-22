import { AnimatePresence, motion, useDragControls } from 'framer-motion'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '../lib/utils'
import { useDesktop } from '../lib/useMedia'

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
  const controls = useDragControls()
  const desktop = useDesktop()
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 flex items-end justify-center lg:items-center" style={{ zIndex: z }}>
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-lg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            className={cn(
              'relative flex w-full max-w-[520px] flex-col rounded-t-[32px] border border-b-0 border-white/[0.08] bg-[#0B0F17]/95 backdrop-blur-2xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.14),0_-20px_60px_-20px_rgba(0,0,0,0.85)] lg:max-w-xl lg:rounded-[28px] lg:border-b lg:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.14),0_40px_80px_-20px_rgba(0,0,0,0.9)]',
              full ? 'h-[94dvh] lg:h-[86dvh]' : 'max-h-[90dvh] lg:max-h-[86dvh]',
            )}
            initial={desktop ? { y: 24, opacity: 0, scale: 0.97 } : { y: '100%' }}
            animate={desktop ? { y: 0, opacity: 1, scale: 1 } : { y: 0 }}
            exit={desktop ? { y: 16, opacity: 0, scale: 0.98 } : { y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            drag={desktop ? false : 'y'}
            dragControls={controls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.7 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 110 || info.velocity.y > 700) onClose()
            }}
          >
            <div className="relative flex touch-none items-center justify-between px-5 pb-2 pt-3" onPointerDown={(e) => controls.start(e)}>
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
            <div
              className="flex-1 overflow-y-auto overscroll-contain px-5 pb-[calc(24px+var(--safe-bottom))] pt-2"
              onFocusCapture={(e) => {
                // keep the focused field above the on-screen keyboard
                const t = e.target as HTMLElement
                if (/^(INPUT|TEXTAREA)$/.test(t.tagName)) window.setTimeout(() => t.scrollIntoView({ block: 'center', behavior: 'smooth' }), 320)
              }}
            >
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
