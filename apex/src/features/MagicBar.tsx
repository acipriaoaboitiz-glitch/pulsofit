import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Dumbbell, Droplets, Flame, Footprints, Loader2, Mic, Sparkles, Utensils, Wand2, X } from 'lucide-react'
import { MealPicker } from './ProductSheet'
import { AI_TEXT_LIMIT, useStore } from '../lib/store'
import { AiLimitError, aiQuickParse } from '../lib/ai'
import { parseMagic } from '../lib/parser'
import type { ExerciseItem, MagicItem } from '../lib/parser'
import { FOODS_DB } from '../lib/foodsDb'
import { allExercises, MUSCLES } from '../lib/exercises'
import { bestE1rm, isPr, sessionVolume } from '../lib/workout'
import { cardioKcal, gymKcal, suggestIntensity, CARDIO, epley } from '../lib/calc'
import type { Meal, Muscle, SessionExercise, SetLog } from '../lib/types'
import { cn, defaultMeal, fmt, haptic, todayKey } from '../lib/utils'

// ---- Web Speech API (not in lib.dom for every browser) ----
interface SpeechRec {
  lang: string
  interimResults: boolean
  continuous: boolean
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  onend: (() => void) | null
  onerror: (() => void) | null
  start: () => void
  stop: () => void
}
type SpeechCtor = new () => SpeechRec
const speechCtor = (): SpeechCtor | undefined => {
  const w = window as unknown as { SpeechRecognition?: SpeechCtor; webkitSpeechRecognition?: SpeechCtor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition
}

const EXAMPLES = ['200g de pechuga de pollo con 150g de arroz y un plátano', 'Press banca 4 series: 10x70kg, 8x80kg, 8x80kg', 'Sentadilla 3x10 100', '500 ml de agua', '30 min correr']

function describe(it: MagicItem): { icon: typeof Utensils; title: string; sub: string; color: string } {
  switch (it.kind) {
    case 'food':
      return { icon: Utensils, title: it.name, sub: `${it.grams} g · P ${it.protein} · C ${it.carbs} · G ${it.fat}`, color: 'text-emerald' }
    case 'exercise':
      return {
        icon: Dumbbell,
        title: it.name,
        sub: it.sets.map((s) => `${s.reps}×${s.kg}kg`).join(' · '),
        color: 'text-neon',
      }
    case 'water':
      return { icon: Droplets, title: 'Agua', sub: `${it.ml} ml`, color: 'text-aqua' }
    case 'steps':
      return { icon: Footprints, title: 'Pasos', sub: `${fmt(it.steps)} pasos`, color: 'text-fire' }
    case 'cardio':
      return { icon: Flame, title: CARDIO.find((c) => c.id === it.cardio)?.name ?? 'Cardio', sub: `${it.minutes} min`, color: 'text-fire' }
  }
}

export function MagicBar({ className, suggestions }: { className?: string; suggestions?: string[] }) {
  const { state, addFood, addWater, addSteps, addCardio, addSession, addCustomExercise, setActive, aiTextRemaining, bumpAi } = useStore()
  const [text, setText] = useState('')
  const [aiItems, setAiItems] = useState<MagicItem[] | null>(null)
  const [aiBusy, setAiBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const [meal, setMeal] = useState<Meal>(defaultMeal())
  const [muscles, setMuscles] = useState<Record<number, Muscle>>({})
  const [listening, setListening] = useState(false)
  const [done, setDone] = useState<string | null>(null)
  const recRef = useRef<SpeechRec | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const canSpeak = typeof window !== 'undefined' && Boolean(speechCtor())

  // offline parse on every keystroke: instant, free, no AI quota
  const local = useMemo(() => parseMagic(text, { exercises: allExercises(), foods: FOODS_DB }), [text, state.custom])
  const items = aiItems ?? local.items
  const hasFood = items.some((i) => i.kind === 'food')
  const needsAi = text.trim().length > 3 && (local.unknown.length > 0 || local.items.length === 0) && aiItems === null

  useEffect(() => {
    setAiItems(null)
    setNote(null)
    setMuscles({})
  }, [text])
  useEffect(() => () => recRef.current?.stop(), [])

  const toggleMic = () => {
    const Ctor = speechCtor()
    if (!Ctor) return
    if (listening) {
      recRef.current?.stop()
      return
    }
    const rec = new Ctor()
    rec.lang = 'es-ES'
    rec.interimResults = true
    rec.continuous = false
    rec.onresult = (e) => {
      const r = Array.from(e.results as ArrayLike<ArrayLike<{ transcript: string }>>)
      setText(r.map((x) => x[0]?.transcript ?? '').join(' ').trim())
    }
    rec.onend = () => setListening(false)
    rec.onerror = () => setListening(false)
    recRef.current = rec
    haptic(12)
    setListening(true)
    try {
      rec.start()
    } catch {
      setListening(false)
    }
  }

  const improve = async () => {
    setAiBusy(true)
    setNote(null)
    try {
      const out = await aiQuickParse(text)
      if (out === null) setNote('La IA no está disponible ahora (modo local o sin clave). Usa un formato como «200g de pollo» o «press banca 4x8 80kg».')
      else if (out.length === 0) setNote('La IA tampoco ha encontrado nada que registrar.')
      else {
        setAiItems(out)
        bumpAi('text')
      }
    } catch (e) {
      setNote(e instanceof AiLimitError ? e.message : 'No se pudo consultar la IA.')
    } finally {
      setAiBusy(false)
    }
  }

  const apply = () => {
    const date = todayKey()
    let kcalAdded = 0
    let label = 0
    items.forEach((it, idx) => {
      switch (it.kind) {
        case 'food':
          addFood({ date, meal, name: it.name, grams: it.grams, kcal: it.kcal, protein: it.protein, carbs: it.carbs, fat: it.fat, source: 'text' })
          kcalAdded += it.kcal
          break
        case 'water':
          addWater(it.ml)
          break
        case 'steps':
          addSteps(it.steps)
          break
        case 'cardio': {
          const kcal = cardioKcal(it.cardio, state.profile?.weightKg ?? 75, it.minutes)
          addCardio({ date, cardio: it.cardio, minutes: it.minutes, kcal })
          kcalAdded += kcal
          break
        }
        case 'exercise': {
          const id = it.exerciseId ?? addCustomExercise(it.name, muscles[idx] ?? it.muscle).id
          const result = logExercise(it, id)
          kcalAdded += result
          break
        }
      }
      label++
    })
    haptic([14, 30, 14])
    setDone(`${label} ${label === 1 ? 'registro añadido' : 'registros añadidos'}${kcalAdded ? ` · ${fmt(kcalAdded)} kcal` : ''}`)
    window.setTimeout(() => setDone(null), 2600)
    setText('')
    inputRef.current?.blur()
  }

  /** Adds the exercise (sets already done) to the running workout or saves it as a quick session. Returns kcal burned. */
  function logExercise(it: ExerciseItem, id: string): number {
    const earlier: SetLog[] = []
    const base = bestE1rm(state.sessions, id)
    const sets: SetLog[] = it.sets.map((s) => {
      const set: SetLog = { kg: s.kg, reps: s.reps, done: true }
      if (isPr(base, earlier, set)) set.pr = true
      earlier.push(set)
      return set
    })
    const ex: SessionExercise = { exerciseId: id, sets, restSec: 90 }
    if (state.active) {
      setActive({ ...state.active, exercises: [...state.active.exercises, ex] })
      return 0
    }
    const vol = sessionVolume([ex])
    const durationSec = Math.max(300, sets.length * 150)
    const intensity = suggestIntensity(vol, durationSec / 60)
    const kcal = gymKcal(intensity, state.profile?.weightKg ?? 75, durationSec)
    addSession({
      date: todayKey(),
      routineName: 'Registro rápido',
      startedAt: Date.now() - durationSec * 1000,
      durationSec,
      intensity,
      kcal,
      volume: vol,
      prCount: sets.filter((s) => s.pr).length,
      exercises: [ex],
    })
    return kcal
  }

  const total = items.reduce((a, i) => a + (i.kind === 'food' ? i.kcal : 0), 0)
  const placeholder = useMemo(() => EXAMPLES[Math.floor(Math.random() * EXAMPLES.length)], [])

  return (
    <div className={className}>
      <div className={cn('flex items-center gap-2 rounded-[20px] border bg-white/[0.04] p-1.5 pl-3.5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)] transition-colors', listening ? 'border-neon/70' : 'border-white/[0.09] focus-within:border-emerald/50')}>
        <Sparkles size={18} className="shrink-0 text-emerald" />
        <input
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && items.length > 0 && apply()}
          placeholder={listening ? 'Escuchando…' : placeholder}
          aria-label="Barra mágica: escribe o dicta lo que has comido o entrenado"
          enterKeyHint="done"
          className="h-10 min-w-0 flex-1 bg-transparent text-[15px] text-white outline-none placeholder:text-white/30"
        />
        {text && (
          <button aria-label="Borrar" onClick={() => setText('')} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-white/40 active:scale-90">
            <X size={17} />
          </button>
        )}
        {canSpeak && (
          <button aria-label={listening ? 'Parar dictado' : 'Dictar por voz'} onClick={toggleMic} className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-xl transition active:scale-90', listening ? 'bg-neon text-white' : 'bg-white/[0.07] text-white/70')}>
            <Mic size={18} />
          </button>
        )}
      </div>

      {suggestions && !text && (
        <div className="-mx-4 mt-2 flex gap-2 overflow-x-auto px-4 pb-0.5 lg:mx-0 lg:px-0">
          {suggestions.map((sg) => (
            <button
              key={sg}
              onClick={() => {
                haptic(8)
                setText(sg)
                inputRef.current?.focus()
              }}
              className="chip !py-1.5 !text-[12px] whitespace-nowrap"
            >
              <Sparkles size={11} className="text-emerald" />
              {sg}
            </button>
          ))}
        </div>
      )}

      <AnimatePresence>
        {done && (
          <motion.p key="done" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-2 flex items-center gap-1.5 px-1 text-[13px] font-bold text-emerald">
            <Check size={15} strokeWidth={3} /> {done}
          </motion.p>
        )}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {(items.length > 0 || needsAi || note) && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="card mt-2 space-y-3 p-3.5">
              {items.length > 0 && (
                <ul className="space-y-2">
                  {items.map((it, i) => {
                    const d = describe(it)
                    const Icon = d.icon
                    return (
                      <li key={i} className="flex items-start gap-3">
                        <div className={cn('mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/[0.05]', d.color)}>
                          <Icon size={17} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[14px] font-bold">
                            {d.title}
                            {it.kind === 'exercise' && !it.exerciseId && <span className="ml-1.5 rounded bg-neon/20 px-1 text-[10px] font-bold text-violet-200">NUEVO</span>}
                          </div>
                          <div className="num text-[12px] text-white/45">{d.sub}</div>
                          {it.kind === 'exercise' && !it.exerciseId && (
                            <select
                              aria-label="Músculo del ejercicio nuevo"
                              value={muscles[i] ?? it.muscle}
                              onChange={(e) => setMuscles((m) => ({ ...m, [i]: e.target.value as Muscle }))}
                              className="mt-1.5 rounded-lg border border-line bg-raised px-2 py-1 text-[12px] text-white/80"
                            >
                              {MUSCLES.map((m) => (
                                <option key={m} value={m}>
                                  {m}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                        {it.kind === 'food' && (
                          <div className="num text-right">
                            <span className="text-[15px] font-bold">{it.kcal}</span>
                            <span className="ml-0.5 text-[10px] text-white/35">kcal</span>
                          </div>
                        )}
                        {it.kind === 'exercise' && (
                          <div className="num text-right text-[11px] text-white/40">
                            1RM <b className="text-violet-300">{Math.round(Math.max(...it.sets.map((s) => epley(s.kg, s.reps))))}</b>
                          </div>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}

              {hasFood && <MealPicker value={meal} onChange={setMeal} />}

              {needsAi && (
                <div>
                  {local.unknown.length > 0 && items.length > 0 && <p className="mb-2 text-[12px] text-white/45">No reconocido: {local.unknown.join(', ')}</p>}
                  <button className="btn-ghost w-full !py-2.5 text-[13px]" onClick={() => void improve()} disabled={aiBusy || aiTextRemaining === 0}>
                    {aiBusy ? <Loader2 size={15} className="animate-spin" /> : <Wand2 size={15} />}
                    Mejorar con IA
                    <span className="num text-white/40">
                      {aiTextRemaining}/{AI_TEXT_LIMIT}
                    </span>
                  </button>
                </div>
              )}
              {note && <p className="text-[12px] text-fire">{note}</p>}

              {items.length > 0 && (
                <button className="btn-primary w-full" onClick={apply}>
                  <Check size={18} strokeWidth={3} />
                  Añadir{total > 0 ? ` · ${fmt(total)} kcal` : ''}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
