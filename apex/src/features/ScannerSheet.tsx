import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import type { Html5Qrcode } from 'html5-qrcode'
import { Barcode, CameraOff, Loader2, PackageSearch, RefreshCw, X } from 'lucide-react'
import { NutriBadge } from './ProductSheet'
import { useUI } from '../lib/ui'
import { fetchBarcode } from '../lib/off'
import type { FoodProduct } from '../lib/types'
import { haptic } from '../lib/utils'

const READER_ID = 'apex-reader'

type Status = 'starting' | 'scanning' | 'loading' | 'found' | 'notfound' | 'error'

const CORNERS = ['tl', 'tr', 'bl', 'br'] as const

/** Full-screen camera in the spirit of Face ID: dark mask, glowing emerald corners, soft laser, product card slides up on detection. */
function ScannerBody() {
  const ui = useUI()
  const [status, setStatus] = useState<Status>('starting')
  const [message, setMessage] = useState('')
  const [code, setCode] = useState('')
  const [manual, setManual] = useState('')
  const [product, setProduct] = useState<FoodProduct | null>(null)
  const busy = useRef(false)
  const scannerRef = useRef<Html5Qrcode | null>(null)

  const resolve = useCallback(async (raw: string) => {
    if (busy.current) return
    busy.current = true
    let digits = raw.trim()
    if (!/^\d{6,14}$/.test(digits)) digits = /(\d{8,14})/.exec(raw)?.[1] ?? ''
    if (!digits) {
      setStatus('notfound')
      setCode(raw.slice(0, 40))
      setMessage('Este código no corresponde a un producto alimentario.')
      busy.current = false
      return
    }
    haptic(25)
    try {
      scannerRef.current?.pause(true)
    } catch {
      /* already paused */
    }
    setStatus('loading')
    setCode(digits)
    try {
      const p = await fetchBarcode(digits)
      if (p) {
        haptic([20, 40, 20])
        setProduct(p)
        setStatus('found')
        return // stays "busy" until the user dismisses the card
      }
      setStatus('notfound')
      setMessage('Todavía no está en Open Food Facts.')
    } catch (e) {
      setStatus('error')
      setMessage(e instanceof Error ? e.message : 'No se pudo consultar el producto.')
    }
    busy.current = false
  }, [])

  useEffect(() => {
    let cancelled = false
    let scanner: Html5Qrcode | null = null
    // html5-qrcode is heavy: load it only when the scanner is opened
    const starting = (async () => {
      const lib = await import('html5-qrcode')
      if (cancelled) return
      const F = lib.Html5QrcodeSupportedFormats
      scanner = new lib.Html5Qrcode(READER_ID, {
        verbose: false,
        useBarCodeDetectorIfSupported: true,
        formatsToSupport: [F.EAN_13, F.EAN_8, F.UPC_A, F.UPC_E, F.CODE_128, F.QR_CODE],
      })
      scannerRef.current = scanner
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 12, qrbox: (w) => ({ width: Math.floor(w * 0.78), height: Math.floor(w * 0.78 * 0.6) }) },
        (text) => void resolve(text),
        () => {},
      )
      if (!cancelled) setStatus('scanning')
    })().catch((err: unknown) => {
      if (cancelled) return
      setStatus('error')
      const msg = String(err)
      setMessage(
        /Permission|NotAllowed/i.test(msg)
          ? 'Permiso de cámara denegado. Actívalo en los ajustes del navegador o escribe el código.'
          : /NotFound|Requested device/i.test(msg)
            ? 'No se encontró ninguna cámara. Puedes escribir el código a mano.'
            : 'No se pudo abrir la cámara (necesita HTTPS). Escribe el código a mano.',
      )
    })
    return () => {
      cancelled = true
      void starting.finally(async () => {
        const sc = scanner
        if (!sc) return
        try {
          if (sc.isScanning) await sc.stop()
        } catch {
          /* ignore */
        }
        try {
          sc.clear()
        } catch {
          /* ignore */
        }
      })
    }
  }, [resolve])

  const resume = () => {
    busy.current = false
    setProduct(null)
    setStatus('scanning')
    try {
      scannerRef.current?.resume()
    } catch {
      /* not paused */
    }
  }

  const cameraBad = status === 'error' && !scannerRef.current?.isScanning
  const showFrame = status === 'scanning' || status === 'loading' || status === 'found'

  return (
    <motion.div className="fixed inset-0 z-[65] overflow-hidden bg-black" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} role="dialog" aria-modal="true" aria-label="Escáner de código">
      {/* camera + mask + frame (the frame is sized exactly like the library's scan box) */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative w-full max-w-[720px]">
          <div id={READER_ID} className="min-h-[300px] w-full" />
          {showFrame && (
            <div className="pointer-events-none absolute inset-0 grid place-items-center">
              <div className="relative aspect-[1/0.6] w-[78%] rounded-[22px] shadow-[0_0_0_100vmax_rgba(0,0,0,0.66)]">
                {CORNERS.map((k) => (
                  <motion.span
                    key={k}
                    className="absolute h-9 w-9 border-emerald"
                    animate={{ opacity: [0.75, 1, 0.75] }}
                    transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
                    style={{
                      top: k[0] === 't' ? -2 : undefined,
                      bottom: k[0] === 'b' ? -2 : undefined,
                      left: k[1] === 'l' ? -2 : undefined,
                      right: k[1] === 'r' ? -2 : undefined,
                      borderTopWidth: k[0] === 't' ? 4 : 0,
                      borderBottomWidth: k[0] === 'b' ? 4 : 0,
                      borderLeftWidth: k[1] === 'l' ? 4 : 0,
                      borderRightWidth: k[1] === 'r' ? 4 : 0,
                      borderTopLeftRadius: k === 'tl' ? 22 : 0,
                      borderTopRightRadius: k === 'tr' ? 22 : 0,
                      borderBottomLeftRadius: k === 'bl' ? 22 : 0,
                      borderBottomRightRadius: k === 'br' ? 22 : 0,
                      filter: 'drop-shadow(0 0 8px rgba(16,185,129,0.9))',
                    }}
                  />
                ))}
                {status === 'scanning' && (
                  <motion.div
                    className="absolute inset-x-3 h-[2px] rounded-full bg-gradient-to-r from-transparent via-emerald to-transparent shadow-[0_0_18px_4px_rgba(16,185,129,0.7)]"
                    animate={{ top: ['8%', '92%', '8%'] }}
                    transition={{ repeat: Infinity, duration: 2.6, ease: 'easeInOut' }}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {cameraBad && (
        <div className="absolute inset-0 grid place-items-center p-8 text-center">
          <div>
            <CameraOff className="mx-auto mb-3 text-white/40" size={34} />
            <p className="mx-auto max-w-[320px] text-[13px] leading-snug text-white/60">{message}</p>
          </div>
        </div>
      )}

      {/* top bar */}
      <div className="absolute inset-x-0 top-0 flex items-center justify-between px-4 pt-[calc(14px+var(--safe-top))]">
        <button onClick={ui.close} aria-label="Cerrar escáner" className="grid h-11 w-11 place-items-center rounded-full border border-white/15 bg-black/50 text-white active:scale-90">
          <X size={20} />
        </button>
        <span className="rounded-full border border-white/10 bg-black/50 px-3.5 py-1.5 text-[12px] font-bold">
          {status === 'starting' ? 'Abriendo cámara…' : status === 'loading' ? 'Buscando producto…' : 'Escanear código'}
        </span>
        <span className="w-11" />
      </div>

      {status === 'loading' && (
        <div className="absolute inset-x-0 top-1/2 flex -translate-y-1/2 flex-col items-center gap-2">
          <Loader2 className="animate-spin text-emerald" size={30} />
          <span className="num text-[13px] text-white/80">{code}</span>
        </div>
      )}

      {/* bottom: manual entry + sliding result card */}
      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-3 px-4 pb-[calc(18px+var(--safe-bottom))]">
        <AnimatePresence mode="wait">
          {status === 'found' && product && (
            <motion.div
              key="found"
              initial={{ y: 120, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 120, opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className="card w-full max-w-[520px] p-4"
            >
              <div className="flex items-center gap-3.5">
                {product.image ? <img src={product.image} alt="" className="h-16 w-16 shrink-0 rounded-2xl bg-white object-contain p-1" /> : <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-white/[0.06] text-2xl">🍽️</div>}
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-[15px] font-extrabold leading-tight">{product.name}</p>
                  {product.brand && <p className="mt-0.5 truncate text-[12px] text-white/50">{product.brand}</p>}
                  <div className="mt-1.5 flex items-center gap-2">
                    <NutriBadge grade={product.nutriScore} />
                    <span className="num text-[12px] text-white/60">
                      <b className="text-white">{product.per100.kcal}</b> kcal · P {product.per100.protein} · C {product.per100.carbs} · G {product.per100.fat}
                      <span className="text-white/35"> /100g</span>
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-3.5 grid grid-cols-[1fr_auto] gap-2">
                <button className="btn-primary" onClick={() => ui.open('product', { product })}>
                  Añadir a mi día
                </button>
                <button className="btn-ghost !px-4" onClick={resume} aria-label="Seguir escaneando">
                  <RefreshCw size={17} />
                </button>
              </div>
            </motion.div>
          )}

          {(status === 'notfound' || (status === 'error' && !cameraBad)) && (
            <motion.div key="nf" initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }} transition={{ type: 'spring', damping: 28, stiffness: 320 }} className="card flex w-full max-w-[520px] items-start gap-3 p-4">
              <PackageSearch className="mt-0.5 shrink-0 text-fire" size={22} />
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-bold">{status === 'notfound' ? 'Producto no encontrado' : 'Algo falló'}</p>
                <p className="mt-0.5 text-[13px] text-white/55">{message}</p>
                {code && <p className="num mt-1 text-[12px] text-white/35">{code}</p>}
                <div className="mt-3 flex gap-2">
                  <button className="btn-ghost !px-3 !py-2 text-[13px]" onClick={resume}>
                    <RefreshCw size={15} /> Reintentar
                  </button>
                  <button className="btn-ghost !px-3 !py-2 text-[13px]" onClick={() => ui.open('custom')}>
                    Crear alimento
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {status !== 'found' && (
          <>
            {status === 'scanning' && <p className="text-[12.5px] text-white/60">Apunta al código de barras (EAN/UPC) o QR del producto</p>}
            <form
              className="flex w-full max-w-[520px] gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                if (manual.trim()) {
                  busy.current = false
                  void resolve(manual)
                }
              }}
            >
              <div className="relative flex-1">
                <Barcode size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
                <input className="input num !bg-black/50 pl-11" inputMode="numeric" placeholder="O escribe el código (ej. 8410188012641)" value={manual} onChange={(e) => setManual(e.target.value.replace(/\D/g, '').slice(0, 14))} aria-label="Código de barras" />
              </div>
              <button className="btn-primary" type="submit" disabled={manual.length < 6}>
                Buscar
              </button>
            </form>
          </>
        )}
      </div>
    </motion.div>
  )
}

export function ScannerSheet() {
  const { sheet } = useUI()
  const open = sheet?.name === 'scan'
  return createPortal(<AnimatePresence>{open && <ScannerBody key="scanner" />}</AnimatePresence>, document.body)
}
