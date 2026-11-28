import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Barcode, CameraOff, Flashlight, FlashlightOff, ImagePlus, Loader2, PackageSearch, RefreshCw, Search, X } from 'lucide-react'
import { NutriBadge } from './ProductSheet'
import { useUI } from '../lib/ui'
import { fetchBarcode } from '../lib/off'
import { decodeImage, getDetector } from '../lib/barcode'
import type { FoodProduct } from '../lib/types'
import { cn, haptic } from '../lib/utils'

type Status = 'starting' | 'scanning' | 'loading' | 'found' | 'notfound' | 'error'

const CORNERS = ['tl', 'tr', 'bl', 'br'] as const
const RECENT_KEY = 'pulso.scans'

function readRecent(): FoodProduct[] {
  try {
    const v = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]') as unknown
    return Array.isArray(v) ? (v as FoodProduct[]) : []
  } catch {
    return []
  }
}
function remember(p: FoodProduct): void {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify([p, ...readRecent().filter((x) => x.id !== p.id)].slice(0, 8)))
  } catch {
    /* storage full or blocked: not important */
  }
}

/** torch / zoom / focus are real camera features that the DOM typings do not include yet */
type CameraCaps = MediaTrackCapabilities & { torch?: boolean; zoom?: { min: number; max: number }; focusMode?: string[] }
const constrain = (track: MediaStreamTrack, c: Record<string, unknown>): Promise<void> => track.applyConstraints({ advanced: [c as MediaTrackConstraintSet] })

/** Full-screen HD camera: continuous reading, torch, zoom, photo fallback and recent scans. */
function ScannerBody() {
  const ui = useUI()
  const [status, setStatus] = useState<Status>('starting')
  const [message, setMessage] = useState('')
  const [cameraError, setCameraError] = useState('')
  const [code, setCode] = useState('')
  const [manual, setManual] = useState('')
  const [product, setProduct] = useState<FoodProduct | null>(null)
  const [torch, setTorch] = useState<boolean | null>(null) // null = the camera has no torch
  const [zoom, setZoom] = useState<number | null>(null)
  const [recent] = useState(readRecent)
  const busy = useRef(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const trackRef = useRef<MediaStreamTrack | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const resolve = useCallback(async (raw: string) => {
    if (busy.current) return
    busy.current = true // stays busy until the user dismisses the result
    let digits = raw.trim()
    if (!/^\d{6,14}$/.test(digits)) digits = /(\d{8,14})/.exec(raw)?.[1] ?? ''
    if (!digits) {
      setCode(raw.slice(0, 40))
      setMessage('Este código no corresponde a un producto alimentario.')
      setStatus('notfound')
      return
    }
    haptic(25)
    setStatus('loading')
    setCode(digits)
    try {
      const p = await fetchBarcode(digits)
      if (p) {
        haptic([20, 40, 20])
        remember(p)
        setProduct(p)
        setStatus('found')
        return
      }
      setMessage('Todavía no está en Open Food Facts. Créalo una vez y lo tendrás guardado.')
      setStatus('notfound')
    } catch {
      setMessage('No se pudo consultar el producto. Revisa tu conexión.')
      setStatus('error')
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    let stream: MediaStream | null = null
    let timer: number | undefined

    void (async () => {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('NoCamera')
      stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
      })
      const video = videoRef.current
      if (cancelled || !video) {
        stream.getTracks().forEach((t) => t.stop())
        return
      }
      video.srcObject = stream
      await video.play()

      const track = stream.getVideoTracks()[0]
      if (track) {
        trackRef.current = track
        const caps = (track.getCapabilities?.() ?? {}) as CameraCaps
        if (caps.focusMode?.includes('continuous')) void constrain(track, { focusMode: 'continuous' }).catch(() => undefined)
        if (caps.torch) setTorch(false)
        if (caps.zoom && caps.zoom.max >= 2) setZoom(1)
      }

      const detector = await getDetector()
      if (cancelled) return
      setStatus((s) => (s === 'starting' ? 'scanning' : s))

      const tick = async () => {
        if (cancelled) return
        if (!busy.current && video.readyState >= 2) {
          try {
            const hit = (await detector.detect(video))[0]
            if (hit && !cancelled) void resolve(hit.rawValue)
          } catch {
            /* a bad frame: try the next one */
          }
        }
        timer = window.setTimeout(() => void tick(), 120)
      }
      void tick()
    })().catch((err: unknown) => {
      if (cancelled) return
      const msg = `${(err as { name?: string }).name ?? ''} ${String(err)}`
      setCameraError(
        /Permission|NotAllowed/i.test(msg)
          ? 'Permiso de cámara denegado. Actívalo en los ajustes del navegador, o usa «Foto del código».'
          : /NotFound|NoCamera|Requested device/i.test(msg)
            ? 'No se encontró ninguna cámara. Usa «Foto del código» o escribe los números.'
            : 'No se pudo abrir la cámara. Usa «Foto del código» o escribe los números.',
      )
      setStatus((s) => (s === 'starting' ? 'error' : s))
    })

    return () => {
      cancelled = true
      window.clearTimeout(timer)
      stream?.getTracks().forEach((t) => t.stop())
      trackRef.current = null
    }
  }, [resolve])

  const resume = () => {
    busy.current = false
    setProduct(null)
    setCode('')
    setStatus(cameraError ? 'error' : 'scanning')
  }

  const fromPhoto = async (file: File | undefined) => {
    if (!file) return
    busy.current = true
    setProduct(null)
    setCode('')
    setStatus('loading')
    try {
      const value = await decodeImage(file)
      busy.current = false
      if (value) return void resolve(value)
      busy.current = true
      setMessage('No he podido leer el código en la foto. Acércate, evita reflejos y que salga entero.')
    } catch {
      setMessage('No se pudo procesar la foto.')
    }
    setStatus('notfound')
  }

  const toggleTorch = () => {
    const t = trackRef.current
    if (!t || torch === null) return
    haptic(10)
    void constrain(t, { torch: !torch })
      .then(() => setTorch(!torch))
      .catch(() => setTorch(null))
  }
  const changeZoom = (z: number) => {
    const t = trackRef.current
    if (!t) return
    haptic(8)
    void constrain(t, { zoom: z })
      .then(() => setZoom(z))
      .catch(() => setZoom(null))
  }

  const live = !cameraError
  const showFrame = live && (status === 'scanning' || status === 'loading' || status === 'found')
  const roundBtn = 'grid h-11 w-11 place-items-center rounded-full border border-white/15 bg-black/50 text-white backdrop-blur-md active:scale-90'

  return (
    <motion.div className="fixed inset-0 z-[65] overflow-hidden bg-black" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} role="dialog" aria-modal="true" aria-label="Escáner de código">
      <video ref={videoRef} className="absolute inset-0 h-full w-full object-cover" playsInline muted autoPlay />

      {showFrame && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center pb-24">
          <div className="relative aspect-[1/0.62] w-[82%] max-w-[440px] rounded-[22px] shadow-[0_0_0_100vmax_rgba(0,0,0,0.55)]">
            {CORNERS.map((k) => (
              <motion.span
                key={k}
                className="absolute h-10 w-10 border-emerald"
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

      {cameraError && status === 'error' && (
        <div className="absolute inset-0 grid place-items-center p-8 pb-48 text-center">
          <div>
            <CameraOff className="mx-auto mb-3 text-white/40" size={34} />
            <p className="mx-auto max-w-[320px] text-[13px] leading-snug text-white/60">{cameraError}</p>
          </div>
        </div>
      )}

      {/* top bar */}
      <div className="absolute inset-x-0 top-0 flex items-center justify-between px-4 pt-[calc(14px+var(--safe-top))]">
        <button onClick={ui.close} aria-label="Cerrar escáner" className={roundBtn}>
          <X size={20} />
        </button>
        <span className="rounded-full border border-white/10 bg-black/50 px-3.5 py-1.5 text-[12px] font-bold backdrop-blur-md">
          {status === 'starting' ? 'Abriendo cámara…' : status === 'loading' ? 'Buscando producto…' : 'Escanear código'}
        </span>
        {torch === null ? (
          <span className="w-11" />
        ) : (
          <button onClick={toggleTorch} aria-label={torch ? 'Apagar linterna' : 'Encender linterna'} aria-pressed={torch} className={cn(roundBtn, torch && '!bg-emerald !text-[#04130d]')}>
            {torch ? <Flashlight size={19} /> : <FlashlightOff size={19} />}
          </button>
        )}
      </div>

      {(status === 'loading' || status === 'starting') && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 pb-24">
          <Loader2 className="animate-spin text-emerald" size={30} />
          <span className="num text-[13px] text-white/80">{code}</span>
        </div>
      )}

      {/* bottom: result, or tools */}
      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-3 px-4 pb-[calc(16px+var(--safe-bottom))]">
        <AnimatePresence mode="wait">
          {status === 'found' && product && (
            <motion.div key="found" initial={{ y: 120, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 120, opacity: 0 }} transition={{ type: 'spring', damping: 28, stiffness: 320 }} className="card w-full max-w-[520px] p-4">
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
                <button className="btn-ghost !px-4" onClick={resume} aria-label="Escanear otro">
                  <RefreshCw size={17} />
                </button>
              </div>
            </motion.div>
          )}

          {(status === 'notfound' || (status === 'error' && !cameraError)) && (
            <motion.div key="nf" initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }} transition={{ type: 'spring', damping: 28, stiffness: 320 }} className="card flex w-full max-w-[520px] items-start gap-3 p-4">
              <PackageSearch className="mt-0.5 shrink-0 text-fire" size={22} />
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-bold">{status === 'notfound' ? 'No lo tengo' : 'Algo falló'}</p>
                <p className="mt-0.5 text-[13px] text-white/55">{message}</p>
                {code && <p className="num mt-1 text-[12px] text-white/35">{code}</p>}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button className="btn-ghost !px-3 !py-2 text-[13px]" onClick={resume}>
                    <RefreshCw size={15} /> Reintentar
                  </button>
                  <button className="btn-ghost !px-3 !py-2 text-[13px]" onClick={() => ui.open('search')}>
                    <Search size={15} /> Buscar
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
            {status === 'scanning' && <p className="text-center text-[12.5px] text-white/70">Encuadra el código de barras. Si no enfoca, aléjalo un poco.</p>}

            {zoom !== null && live && (
              <div className="flex gap-1 rounded-full border border-white/10 bg-black/50 p-1 backdrop-blur-md" role="group" aria-label="Zoom">
                {[1, 2].map((z) => (
                  <button key={z} onClick={() => changeZoom(z)} aria-pressed={zoom === z} className={cn('num h-9 w-11 rounded-full text-[12px] font-bold', zoom === z ? 'bg-white text-black' : 'text-white/70')}>
                    {z}×
                  </button>
                ))}
              </div>
            )}

            {recent.length > 0 && (
              <div className="w-full max-w-[520px]">
                <p className="label mb-1.5">Escaneados antes · 1 toque</p>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {recent.map((p) => (
                    <button key={p.id} onClick={() => ui.open('product', { product: p })} className="flex min-h-[44px] max-w-[190px] shrink-0 items-center gap-2 rounded-2xl border border-white/10 bg-black/60 py-1.5 pl-1.5 pr-3 backdrop-blur-md active:scale-95">
                      {p.image ? <img src={p.image} alt="" className="h-8 w-8 rounded-lg bg-white object-contain" /> : <span className="grid h-8 w-8 place-items-center rounded-lg bg-white/10">🍽️</span>}
                      <span className="truncate text-[12px] font-bold">{p.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button className="btn-ghost w-full max-w-[520px] !bg-black/60 backdrop-blur-md" onClick={() => fileRef.current?.click()}>
              <ImagePlus size={18} /> Foto del código
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                void fromPhoto(e.target.files?.[0])
                e.target.value = ''
              }}
            />

            <form
              className="flex w-full max-w-[520px] gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                if (manual.length >= 6) {
                  busy.current = false
                  void resolve(manual)
                }
              }}
            >
              <div className="relative flex-1">
                <Barcode size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
                <input className="input num !bg-black/60 pl-11" inputMode="numeric" placeholder="Escribe el código" value={manual} onChange={(e) => setManual(e.target.value.replace(/\D/g, '').slice(0, 14))} aria-label="Código de barras" />
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
