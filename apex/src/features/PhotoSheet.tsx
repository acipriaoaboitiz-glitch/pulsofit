import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Camera, Check, Image as ImageIcon, Loader2, Sparkles, TriangleAlert } from 'lucide-react'
import { Sheet } from '../components/Sheet'
import { MealPicker } from './ProductSheet'
import { useStore, AI_PHOTO_LIMIT } from '../lib/store'
import { useUI } from '../lib/ui'
import { AiLimitError, analyzeFoodPhoto, compressImage } from '../lib/ai'
import type { AiFoodResult } from '../lib/ai'
import type { Meal } from '../lib/types'
import { cn, haptic } from '../lib/utils'

type Phase = 'pick' | 'analyzing' | 'result' | 'error'

export function AiCounter({ remaining }: { remaining: number }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-neon/25 bg-neon/10 px-4 py-3">
      <Sparkles size={18} className="shrink-0 text-neon" />
      <div className="flex-1 text-[13px] leading-snug text-white/70">
        Análisis por foto con IA: <b className="text-white">{AI_PHOTO_LIMIT} gratis al día</b>. El resto de la app es ilimitado.
      </div>
      <div className="flex gap-1" aria-label={`${remaining} análisis restantes hoy`}>
        {Array.from({ length: AI_PHOTO_LIMIT }, (_, i) => (
          <span key={i} className={cn('h-2.5 w-2.5 rounded-full', i < remaining ? 'bg-neon' : 'bg-white/15')} />
        ))}
      </div>
      <span className="num text-[13px] font-bold text-neon">
        {remaining}/{AI_PHOTO_LIMIT}
      </span>
    </div>
  )
}

function PhotoBody({ meal: initialMeal, date, onDone }: { meal: Meal; date: string; onDone: () => void }) {
  const { aiRemaining, bumpAi, addFood } = useStore()
  const [phase, setPhase] = useState<Phase>('pick')
  const [thumb, setThumb] = useState<string | null>(null)
  const [res, setRes] = useState<AiFoodResult | null>(null)
  const [err, setErr] = useState('')
  const [name, setName] = useState('')
  const [grams, setGrams] = useState('')
  const [meal, setMeal] = useState<Meal>(initialMeal)
  const [saved, setSaved] = useState(false)
  const camRef = useRef<HTMLInputElement>(null)
  const galRef = useRef<HTMLInputElement>(null)

  const handle = async (file: File | undefined) => {
    if (!file) return
    setPhase('analyzing')
    setErr('')
    try {
      const dataUrl = await compressImage(file, 800, 0.75)
      setThumb(dataUrl)
      const r = await analyzeFoodPhoto(dataUrl)
      setRes(r)
      setName(r.nombre_plato)
      setGrams(String(Math.round(r.peso_estimado_gramos)))
      if (!r.simulado) bumpAi('photo')
      haptic([15, 40, 15])
      setPhase('result')
    } catch (e) {
      if (e instanceof AiLimitError) bumpAi('photo', AI_PHOTO_LIMIT)
      setErr(e instanceof Error ? e.message : 'No se pudo analizar la foto')
      setPhase('error')
    }
  }

  const g = parseFloat(grams.replace(',', '.'))
  const grm = Number.isFinite(g) && g > 0 ? g : 0
  const k = res ? grm / Math.max(1, res.peso_estimado_gramos) : 0
  const m = res
    ? {
        kcal: Math.round(res.calorias * k),
        protein: Math.round(res.proteinas_g * k * 10) / 10,
        carbs: Math.round(res.carbohidratos_g * k * 10) / 10,
        fat: Math.round(res.grasas_g * k * 10) / 10,
      }
    : null

  const save = () => {
    if (!res || !m || grm <= 0) return
    haptic([14, 30, 14])
    addFood({
      date,
      meal,
      name: name.trim() || res.nombre_plato,
      grams: Math.round(grm),
      ...m,
      source: 'ai',
      image: undefined,
    })
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
        void handle(e.target.files?.[0])
        e.target.value = ''
      }}
    />
  )

  return (
    <div className="space-y-4">
      <AiCounter remaining={aiRemaining} />

      {(phase === 'pick' || phase === 'error') && (
        <>
          {phase === 'error' && (
            <div className="flex items-start gap-3 rounded-2xl border border-fire/30 bg-fire/10 p-4 text-[13px] text-white/80">
              <TriangleAlert size={18} className="mt-0.5 shrink-0 text-fire" />
              {err}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <button
              className="card-raised flex flex-col items-center gap-3 py-8 active:scale-95 disabled:opacity-40"
              disabled={aiRemaining === 0}
              onClick={() => camRef.current?.click()}
            >
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-neon text-white shadow-[0_8px_26px_-6px_rgba(139,92,246,0.9)]">
                <Camera size={26} />
              </span>
              <span className="text-[14px] font-bold">Hacer foto</span>
            </button>
            <button
              className="card-raised flex flex-col items-center gap-3 py-8 active:scale-95 disabled:opacity-40"
              disabled={aiRemaining === 0}
              onClick={() => galRef.current?.click()}
            >
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white/[0.08]">
                <ImageIcon size={26} />
              </span>
              <span className="text-[14px] font-bold">Galería</span>
            </button>
          </div>
          {aiRemaining === 0 && (
            <p className="text-center text-[13px] text-fire">
              Has usado tus 3 análisis de hoy. Mañana tendrás 3 más; mientras tanto escanea códigos o busca alimentos.
            </p>
          )}
          {input(camRef, true)}
          {input(galRef, false)}
        </>
      )}

      {phase === 'analyzing' && (
        <div className="relative overflow-hidden rounded-3xl border border-line">
          {thumb && <img src={thumb} alt="" className="h-64 w-full object-cover opacity-60" />}
          <div className="absolute inset-0 grid place-items-center bg-black/40">
            <div className="flex flex-col items-center gap-3">
              <Loader2 size={34} className="animate-spin text-neon" />
              <span className="text-[14px] font-bold">Analizando tu plato…</span>
            </div>
          </div>
          <motion.div
            className="absolute inset-x-0 h-[3px] bg-neon shadow-[0_0_18px_4px_rgba(139,92,246,0.9)]"
            animate={{ top: ['0%', '100%', '0%'] }}
            transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
          />
        </div>
      )}

      {phase === 'result' && res && m && (
        <div className="space-y-4">
          <div className="flex gap-4">
            {thumb && <img src={thumb} alt="" className="h-24 w-24 shrink-0 rounded-2xl object-cover" />}
            <div className="min-w-0 flex-1">
              <input className="input !py-2 text-[16px] font-extrabold" value={name} onChange={(e) => setName(e.target.value)} aria-label="Nombre del plato" />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {res.alimentos_detectados.map((a) => (
                  <span key={a} className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[11px] font-semibold text-white/65">
                    {a}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[12px] text-white/50">
            <span className={cn('rounded-full px-2 py-0.5 font-bold', res.confianza >= 0.7 ? 'bg-emerald/15 text-emerald' : 'bg-fire/15 text-fire')}>
              Confianza {Math.round(res.confianza * 100)}%
            </span>
            {res.simulado && (
              <span className="rounded-full bg-neon/15 px-2 py-0.5 font-bold text-neon">Modo simulado (sin API key)</span>
            )}
          </div>

          <label className="block">
            <span className="label">Peso de la ración — ajústalo si hace falta</span>
            <div className="relative mt-1.5">
              <input
                className="input num pr-10 text-2xl font-bold"
                inputMode="decimal"
                value={grams}
                onChange={(e) => /^\d{0,4}([.,]\d{0,1})?$/.test(e.target.value) && setGrams(e.target.value)}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40">g</span>
            </div>
          </label>

          <div className="num grid grid-cols-4 gap-2 text-center">
            {[
              { v: m.kcal, l: 'kcal', c: '#F4F6FA' },
              { v: m.protein, l: 'prot. g', c: '#10B981' },
              { v: m.carbs, l: 'carbos g', c: '#F97316' },
              { v: m.fat, l: 'grasas g', c: '#8B5CF6' },
            ].map((x) => (
              <div key={x.l} className="card-raised py-3">
                <div className="text-xl font-bold" style={{ color: x.c }}>
                  {x.v}
                </div>
                <div className="text-[10px] font-semibold text-white/40">{x.l}</div>
              </div>
            ))}
          </div>

          <MealPicker value={meal} onChange={setMeal} />

          <button className="btn-primary w-full" disabled={saved || grm <= 0} onClick={save}>
            {saved ? (
              <>
                <Check size={20} strokeWidth={3} /> Guardado
              </>
            ) : (
              'Guardar en mi diario'
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
