import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Camera, Check, Image as ImageIcon, Loader2, Minus, Plus, RefreshCw, ScanBarcode, Search, Sparkles, Trash2, TriangleAlert, Wand2 } from 'lucide-react'
import { Sheet } from '../components/Sheet'
import { MealPicker } from './ProductSheet'
import { useStore, AI_PHOTO_LIMIT } from '../lib/store'
import { useUI } from '../lib/ui'
import { AiLimitError, AiUnavailableError, analyzeFoodPhoto, compressImage } from '../lib/ai'
import type { AiFoodResult, AiItem } from '../lib/ai'
import type { Meal } from '../lib/types'
import { cn, haptic } from '../lib/utils'

type Phase = 'pick' | 'ready' | 'analyzing' | 'result' | 'error' | 'off'

export function AiCounter({ remaining }: { remaining: number }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-neon/25 bg-neon/10 px-4 py-3">
      <Sparkles size={18} className="shrink-0 text-neon" />
      <div className="flex-1 text-[13px] leading-snug text-white/70">
        <b className="text-white">{AI_PHOTO_LIMIT} análisis</b> con IA al día. Todo lo demás es ilimitado.
      </div>
      <div className="flex gap-1" aria-label={`${remaining} análisis restantes hoy`}>
        {Array.from({ length: AI_PHOTO_LIMIT }, (_, i) => (
          <span key={i} className={cn('h-2.5 w-2.5 rounded-full', i < remaining ? 'bg-neon' : 'bg-white/15')} />
        ))}
      </div>
    </div>
  )
}

/** One detected food: the user fixes the grams and everything scales from the AI's estimate. */
interface Row extends AiItem {
  grams: number
}
const scale = (r: Row, per: number) => (per * r.grams) / Math.max(1, r.gramos)
const r1 = (v: number) => Math.round(v * 10) / 10

function PhotoBody({ meal: initialMeal, date, onDone }: { meal: Meal; date: string; onDone: () => void }) {
  const ui = useUI()
  const { aiRemaining, bumpAi, addFood } = useStore()
  const [phase, setPhase] = useState<Phase>('pick')
  const [image, setImage] = useState<string | null>(null)
  const [hint, setHint] = useState('')
  const [res, setRes] = useState<AiFoodResult | null>(null)
  const [rows, setRows] = useState<Row[]>([])
  const [err, setErr] = useState('')
  const [name, setName] = useState('')
  const [meal, setMeal] = useState<Meal>(initialMeal)
  const [saved, setSaved] = useState(false)
  const camRef = useRef<HTMLInputElement>(null)
  const galRef = useRef<HTMLInputElement>(null)

  const choose = async (file: File | undefined) => {
    if (!file) return
    setErr('')
    try {
      // 1280 px keeps enough detail to tell foods apart (and stays far below the upload limit)
      setImage(await compressImage(file, 1280, 0.82))
      setRes(null)
      setPhase('ready')
    } catch {
      setErr('No se pudo abrir esa imagen. Prueba con otra.')
      setPhase('error')
    }
  }

  const analyze = async () => {
    if (!image) return
    setPhase('analyzing')
    setErr('')
    try {
      const r = await analyzeFoodPhoto(image, hint)
      bumpAi('photo')
      if (!r.es_comida) {
        setErr('No veo comida clara en la foto. Hazla desde arriba, con buena luz y el plato entero.')
        setPhase('error')
        return
      }
      setRes(r)
      setName(r.nombre_plato)
      setRows(r.alimentos.map((a) => ({ ...a, grams: a.gramos })))
      haptic([15, 40, 15])
      setPhase('result')
    } catch (e) {
      if (e instanceof AiUnavailableError) return setPhase('off')
      if (e instanceof AiLimitError) bumpAi('photo', AI_PHOTO_LIMIT)
      setErr(e instanceof Error ? e.message : 'No se pudo analizar la foto')
      setPhase('error')
    }
  }

  const total = rows.reduce(
    (a, r) => ({
      grams: a.grams + r.grams,
      kcal: a.kcal + scale(r, r.calorias),
      protein: a.protein + scale(r, r.proteinas_g),
      carbs: a.carbs + scale(r, r.carbohidratos_g),
      fat: a.fat + scale(r, r.grasas_g),
    }),
    { grams: 0, kcal: 0, protein: 0, carbs: 0, fat: 0 },
  )

  const step = (i: number, delta: number) => {
    haptic(8)
    setRows((l) => l.map((r, j) => (j === i ? { ...r, grams: Math.min(2000, Math.max(5, r.grams + delta)) } : r)))
  }

  const save = () => {
    if (!res || rows.length === 0 || saved) return
    haptic([14, 30, 14])
    addFood({ date, meal, name: name.trim() || res.nombre_plato, grams: Math.round(total.grams), kcal: Math.round(total.kcal), protein: r1(total.protein), carbs: r1(total.carbs), fat: r1(total.fat), source: 'ai', image: undefined })
    setSaved(true)
    window.setTimeout(onDone, 650)
  }

  const input = (ref: React.RefObject<HTMLInputElement | null>, capture: boolean) => (
    <input
      ref={ref}
      type="file"
      accept="image/*"
      {...(capture ? { capture: 'environment' as const } : {})}
      className="hidden"
      onChange={(e) => {
        void choose(e.target.files?.[0])
        e.target.value = ''
      }}
    />
  )

  const alternatives = (
    <div className="grid grid-cols-3 gap-2">
      {[
        { l: 'Buscar', icon: Search, go: () => ui.open('search') },
        { l: 'Describirlo', icon: Wand2, go: () => ui.open('magic') },
        { l: 'Escanear', icon: ScanBarcode, go: () => ui.open('scan') },
      ].map((a) => (
        <button key={a.l} onClick={a.go} className="card-raised flex min-h-[72px] flex-col items-center justify-center gap-1.5 text-[12px] font-bold active:scale-95">
          <a.icon size={20} className="text-emerald" />
          {a.l}
        </button>
      ))}
    </div>
  )

  const retake = (
    <div className="grid grid-cols-2 gap-2">
      <button className="btn-ghost" onClick={() => camRef.current?.click()}>
        <Camera size={17} /> Otra foto
      </button>
      <button className="btn-ghost" onClick={() => galRef.current?.click()}>
        <ImageIcon size={17} /> Galería
      </button>
    </div>
  )

  return (
    <div className="space-y-4">
      {input(camRef, true)}
      {input(galRef, false)}

      {phase === 'pick' && (
        <>
          <AiCounter remaining={aiRemaining} />
          <div className="grid grid-cols-2 gap-3">
            <button className="card-raised flex flex-col items-center gap-3 py-8 active:scale-95 disabled:opacity-40" disabled={aiRemaining === 0} onClick={() => camRef.current?.click()}>
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-neon text-white shadow-[0_8px_26px_-6px_rgba(139,92,246,0.9)]">
                <Camera size={26} />
              </span>
              <span className="text-[14px] font-bold">Hacer foto</span>
            </button>
            <button className="card-raised flex flex-col items-center gap-3 py-8 active:scale-95 disabled:opacity-40" disabled={aiRemaining === 0} onClick={() => galRef.current?.click()}>
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white/[0.08]">
                <ImageIcon size={26} />
              </span>
              <span className="text-[14px] font-bold">Galería</span>
            </button>
          </div>
          <p className="text-center text-[12.5px] leading-snug text-white/45">Para acertar: foto desde arriba, buena luz y el plato entero.</p>
          {aiRemaining === 0 && (
            <>
              <p className="text-center text-[13px] text-fire">Has usado los análisis de hoy. Mientras tanto:</p>
              {alternatives}
            </>
          )}
        </>
      )}

      {(phase === 'ready' || phase === 'analyzing') && image && (
        <>
          <div className="relative overflow-hidden rounded-3xl border border-line">
            <img src={image} alt="Tu plato" className={cn('h-60 w-full object-cover', phase === 'analyzing' && 'opacity-55')} />
            {phase === 'analyzing' && (
              <>
                <div className="absolute inset-0 grid place-items-center">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 size={34} className="animate-spin text-neon" />
                    <span className="text-[14px] font-bold">Identificando cada alimento…</span>
                  </div>
                </div>
                <motion.div className="absolute inset-x-0 h-[3px] bg-neon shadow-[0_0_18px_4px_rgba(139,92,246,0.9)]" animate={{ top: ['0%', '100%', '0%'] }} transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }} />
              </>
            )}
          </div>
          {phase === 'ready' && (
            <>
              <label className="block">
                <span className="label">¿Qué es? (opcional, mejora mucho el resultado)</span>
                <input className="input mt-1.5" value={hint} maxLength={200} onChange={(e) => setHint(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && void analyze()} placeholder="Ej. lentejas con chorizo, plato grande" />
              </label>
              <button className="btn-violet w-full !py-3.5 text-[15px]" onClick={() => void analyze()}>
                <Sparkles size={18} /> Analizar plato
              </button>
              {retake}
            </>
          )}
        </>
      )}

      {phase === 'off' && (
        <>
          <div className="rounded-2xl border border-fire/30 bg-fire/10 p-4">
            <p className="flex items-center gap-2 text-[14px] font-extrabold">
              <TriangleAlert size={18} className="shrink-0 text-fire" /> La IA de fotos no está activada
            </p>
            <p className="mt-1.5 text-[13px] leading-snug text-white/65">Prefiero decírtelo a inventarme un plato. No se ha guardado ni descontado nada. Puedes registrarlo así:</p>
          </div>
          {alternatives}
        </>
      )}

      {phase === 'error' && (
        <>
          <div className="flex items-start gap-3 rounded-2xl border border-fire/30 bg-fire/10 p-4 text-[13px] text-white/80">
            <TriangleAlert size={18} className="mt-0.5 shrink-0 text-fire" />
            {err}
          </div>
          {image && aiRemaining > 0 && (
            <button className="btn-violet w-full" onClick={() => setPhase('ready')}>
              <RefreshCw size={17} /> Reintentar
            </button>
          )}
          {retake}
          {alternatives}
        </>
      )}

      {phase === 'result' && res && (
        <div className="space-y-4">
          <div className="flex gap-3">
            {image && <img src={image} alt="" className="h-20 w-20 shrink-0 rounded-2xl object-cover" />}
            <div className="min-w-0 flex-1">
              <input className="input !py-2 text-[16px] font-extrabold" value={name} onChange={(e) => setName(e.target.value)} aria-label="Nombre del plato" />
              <span className={cn('mt-2 inline-block rounded-full px-2.5 py-1 text-[11px] font-bold', res.confianza >= 0.7 ? 'bg-emerald/15 text-emerald' : 'bg-fire/15 text-fire')}>
                {res.confianza >= 0.7 ? 'Seguro' : 'Revísalo'} · {Math.round(res.confianza * 100)}%
              </span>
            </div>
          </div>

          <div className="num card-raised grid grid-cols-4 py-3 text-center">
            {[
              { v: Math.round(total.kcal), l: 'kcal', c: '#F4F6FA' },
              { v: r1(total.protein), l: 'prot. g', c: '#10B981' },
              { v: r1(total.carbs), l: 'carbos g', c: '#F97316' },
              { v: r1(total.fat), l: 'grasas g', c: '#8B5CF6' },
            ].map((x) => (
              <div key={x.l}>
                <div className="text-xl font-bold" style={{ color: x.c }}>
                  {x.v}
                </div>
                <div className="text-[10px] font-semibold text-white/40">{x.l}</div>
              </div>
            ))}
          </div>

          <div>
            <p className="label mb-2">Lo que veo · ajusta los gramos o quita lo que sobre</p>
            <ul className="space-y-2">
              {rows.map((r, i) => (
                <li key={`${r.nombre}-${i}`} className="card-raised p-3">
                  <div className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate text-[14px] font-bold">{r.nombre}</span>
                    <span className="num text-[12px] font-bold text-fire">{Math.round(scale(r, r.calorias))} kcal</span>
                    <button aria-label={`Quitar ${r.nombre}`} className="grid h-9 w-9 place-items-center rounded-lg text-white/35 active:text-fire" onClick={() => setRows((l) => l.filter((_, j) => j !== i))}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <button aria-label="Menos 10 gramos" className="grid h-11 w-11 place-items-center rounded-xl bg-white/[0.07] active:scale-90" onClick={() => step(i, -10)}>
                      <Minus size={16} />
                    </button>
                    <span className="num flex-1 text-center text-[17px] font-bold">{r.grams} g</span>
                    <button aria-label="Más 10 gramos" className="grid h-11 w-11 place-items-center rounded-xl bg-white/[0.07] active:scale-90" onClick={() => step(i, 10)}>
                      <Plus size={16} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {aiRemaining > 0 && (
            <button className="w-full py-1 text-[13px] font-bold text-violet-300 underline-offset-2 hover:underline" onClick={() => setPhase('ready')}>
              ¿No es esto? Descríbelo y vuelvo a analizar
            </button>
          )}

          <MealPicker value={meal} onChange={setMeal} />

          <button className="btn-primary w-full" disabled={saved || rows.length === 0} onClick={save}>
            {saved ? (
              <>
                <Check size={20} strokeWidth={3} /> Guardado
              </>
            ) : (
              `Guardar ${Math.round(total.kcal)} kcal en mi diario`
            )}
          </button>
        </div>
      )}
    </div>
  )
}

export function PhotoSheet() {
  const { sheet, close } = useUI()
  const open = sheet?.name === 'photo'
  return (
    <Sheet open={open} onClose={close} title="Foto de plato · IA">
      {open && sheet && <PhotoBody meal={sheet.meal} date={sheet.date} onDone={close} />}
    </Sheet>
  )
}
