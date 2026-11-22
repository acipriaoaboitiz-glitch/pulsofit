import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import type { Html5Qrcode } from 'html5-qrcode'
import { Barcode, CameraOff, Loader2, PackageSearch, RefreshCw } from 'lucide-react'
import { Sheet } from '../components/Sheet'
import { useUI } from '../lib/ui'
import { fetchBarcode } from '../lib/off'
import { haptic } from '../lib/utils'

const READER_ID = 'apex-reader'

type Status = 'starting' | 'scanning' | 'loading' | 'notfound' | 'error'

function ScannerBody() {
  const ui = useUI()
  const [status, setStatus] = useState<Status>('starting')
  const [message, setMessage] = useState('')
  const [code, setCode] = useState('')
  const [manual, setManual] = useState('')
  const busy = useRef(false)
  const scannerRef = useRef<Html5Qrcode | null>(null)

  const resolve = useCallback(
    async (raw: string) => {
      if (busy.current) return
      busy.current = true
      let digits = raw.trim()
      if (!/^\d{6,14}$/.test(digits)) {
        // QR with a URL / text: look for an embedded barcode number
        digits = /(\d{8,14})/.exec(raw)?.[1] ?? ''
      }
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
        const product = await fetchBarcode(digits)
        if (product) {
          ui.open('product', { product })
          return
        }
        setStatus('notfound')
        setMessage('No está en Open Food Facts todavía.')
      } catch (e) {
        setStatus('error')
        setMessage(e instanceof Error ? e.message : 'No se pudo consultar el producto.')
      }
      busy.current = false
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

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
        {
          fps: 12,
          aspectRatio: 1,
          qrbox: (w, h) => ({ width: Math.floor(w * 0.8), height: Math.floor(Math.min(h, w) * 0.5) }),
        },
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
          ? 'Permiso de cámara denegado. Actívalo en los ajustes del navegador o introduce el código a mano.'
          : /NotFound|Requested device/i.test(msg)
            ? 'No se encontró ninguna cámara. Puedes introducir el código a mano.'
            : 'No se pudo abrir la cámara (necesita HTTPS). Introduce el código a mano.',
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
    setStatus('scanning')
    try {
      scannerRef.current?.resume()
    } catch {
      /* not paused */
    }
  }

  const cameraBad = status === 'error' && !scannerRef.current?.isScanning

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-3xl border border-line bg-black">
        <div id={READER_ID} className="min-h-[260px]" />

        {cameraBad && (
          <div className="absolute inset-0 grid place-items-center bg-black p-6 text-center">
            <div>
              <CameraOff className="mx-auto mb-3 text-white/40" size={34} />
              <p className="text-[13px] text-white/60">{message}</p>
            </div>
          </div>
        )}

        {(status === 'scanning' || status === 'loading') && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <div className="relative h-1/2 w-[80%]">
              {(['tl', 'tr', 'bl', 'br'] as const).map((k) => (
                <span
                  key={k}
                  className="absolute h-7 w-7 border-emerald"
                  style={{
                    top: k[0] === 't' ? 0 : undefined,
                    bottom: k[0] === 'b' ? 0 : undefined,
                    left: k[1] === 'l' ? 0 : undefined,
                    right: k[1] === 'r' ? 0 : undefined,
                    borderTopWidth: k[0] === 't' ? 4 : 0,
                    borderBottomWidth: k[0] === 'b' ? 4 : 0,
                    borderLeftWidth: k[1] === 'l' ? 4 : 0,
                    borderRightWidth: k[1] === 'r' ? 4 : 0,
                    borderTopLeftRadius: k === 'tl' ? 14 : 0,
                    borderTopRightRadius: k === 'tr' ? 14 : 0,
                    borderBottomLeftRadius: k === 'bl' ? 14 : 0,
                    borderBottomRightRadius: k === 'br' ? 14 : 0,
                  }}
                />
              ))}
              {status === 'scanning' && (
                <motion.div
                  className="absolute inset-x-2 h-[3px] rounded-full bg-emerald shadow-[0_0_18px_4px_rgba(16,185,129,0.8)]"
                  animate={{ top: ['6%', '94%', '6%'] }}
                  transition={{ repeat: Infinity, duration: 2.4, ease: 'easeInOut' }}
                />
              )}
            </div>
          </div>
        )}

        {status === 'loading' && (
          <div className="absolute inset-0 grid place-items-center bg-black/60 backdrop-blur-[2px]">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="animate-spin text-emerald" size={30} />
              <span className="num text-[13px] text-white/80">{code}</span>
              <span className="text-[12px] text-white/50">Buscando en Open Food Facts…</span>
            </div>
          </div>
        )}
      </div>

      {status === 'starting' && <p className="text-center text-[13px] text-white/45">Abriendo cámara…</p>}
      {status === 'scanning' && (
        <p className="text-center text-[13px] text-white/45">Apunta al código de barras (EAN/UPC) o QR del producto</p>
      )}

      {(status === 'notfound' || (status === 'error' && !cameraBad)) && (
        <div className="card-raised flex items-start gap-3 p-4">
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
        </div>
      )}

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          if (manual.trim()) {
            busy.current = false
            void resolve(manual)
          }
        }}
      >
        <div className="relative flex-1">
          <Barcode size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/35" />
          <input
            className="input num pl-11"
            inputMode="numeric"
            placeholder="O escribe el código (ej. 8410188012641)"
            value={manual}
            onChange={(e) => setManual(e.target.value.replace(/\D/g, '').slice(0, 14))}
          />
        </div>
        <button className="btn-primary" type="submit" disabled={manual.length < 6}>
          Buscar
        </button>
      </form>
    </div>
  )
}

export function ScannerSheet() {
  const { sheet, close } = useUI()
  const open = sheet?.name === 'scan'
  return (
    <Sheet open={open} onClose={close} title="Escanear código">
      {open && <ScannerBody />}
    </Sheet>
  )
}
