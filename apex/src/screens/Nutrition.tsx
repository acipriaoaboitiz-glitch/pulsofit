import { useMemo, useState } from 'react'
import type { ComponentType } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Camera, ChevronDown, ChevronLeft, ChevronRight, Coffee, Cookie, Copy, Moon, Plus, ScanBarcode, Search, Sparkles, Trash2, Utensils } from 'lucide-react'
import { useStore } from '../lib/store'
import { useUI } from '../lib/ui'
import { MEALS, addDays, cn, defaultMeal, fmt, haptic, prettyDate, todayKey } from '../lib/utils'
import type { FoodLog, Meal } from '../lib/types'
import { MacroBar, PageHeader } from '../components/bits'
import { Ring, SpringNumber } from '../components/Ring'
import { MagicBar } from '../features/MagicBar'
import { SuperStaples } from '../features/SuperStaples'
import { AI_PHOTO_LIMIT } from '../lib/store'

const SUGGESTIONS = ['200g pollo con 150g arroz', 'un plátano y un yogur natural', '2 huevos y 2 tostadas con aceite', 'avena 50g con leche', '30 min de bici', '500 ml de agua']

const MEAL_STYLE: Record<Meal, { icon: ComponentType<{ size?: number }>; tone: string; tile: string }> = {
  desayuno: { icon: Coffee, tone: 'text-fire', tile: 'bg-fire/12 border-fire/25' },
  comida: { icon: Utensils, tone: 'text-emerald', tile: 'bg-emerald/12 border-emerald/25' },
  cena: { icon: Moon, tone: 'text-neon', tile: 'bg-neon/15 border-neon/30' },
  snack: { icon: Cookie, tone: 'text-aqua', tile: 'bg-aqua/12 border-aqua/25' },
}

/** One food row: tap = adjust grams, swipe left (or tap ⋯) = duplicate / delete. */
function Entry({ f }: { f: FoodLog }) {
  const { updateFood, removeFood, addFood } = useStore()
  const [edit, setEdit] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const [g, setG] = useState(String(f.grams))

  const save = () => {
    const n = parseFloat(g.replace(',', '.'))
    if (Number.isFinite(n) && n > 0 && f.grams > 0) {
      const k = n / f.grams
      updateFood(f.id, { grams: Math.round(n), kcal: Math.round(f.kcal * k), protein: Math.round(f.protein * k * 10) / 10, carbs: Math.round(f.carbs * k * 10) / 10, fat: Math.round(f.fat * k * 10) / 10 })
      haptic(10)
    }
    setEdit(false)
  }

  const duplicate = () => {
    haptic([12, 24, 12])
    const { id: _id, u: _u, ...rest } = f
    void _id
    void _u
    addFood(rest)
    setRevealed(false)
  }

  return (
    <motion.li layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -30 }} className="relative overflow-hidden rounded-2xl">
      {/* actions revealed by the swipe */}
      <div className="absolute inset-y-0 right-0 flex w-[132px] items-stretch gap-1.5 p-1">
        <button onClick={duplicate} aria-label={`Duplicar ${f.name}`} className="grid flex-1 place-items-center rounded-xl bg-emerald/20 text-emerald active:scale-95">
          <Copy size={17} />
        </button>
        <button
          onClick={() => {
            haptic(10)
            removeFood(f.id)
          }}
          aria-label={`Eliminar ${f.name}`}
          className="grid flex-1 place-items-center rounded-xl bg-red-500/20 text-red-400 active:scale-95"
        >
          <Trash2 size={17} />
        </button>
      </div>

      <motion.div
        drag="x"
        dragConstraints={{ left: -132, right: 0 }}
        dragElastic={0.12}
        animate={{ x: revealed ? -132 : 0 }}
        onDragEnd={(_, info) => setRevealed(info.offset.x < -50 || (revealed && info.offset.x < 30))}
        transition={{ type: 'spring', stiffness: 400, damping: 34 }}
        className="relative cursor-grab touch-pan-y rounded-2xl bg-[#0d121b] px-3 py-2.5 active:cursor-grabbing"
      >
        <div className="flex items-center gap-3">
          <button
            className="min-w-0 flex-1 text-left"
            onClick={() => {
              if (revealed) return setRevealed(false)
              setG(String(f.grams))
              setEdit((e) => !e)
            }}
          >
            <div className="truncate text-[14px] font-bold">{f.name}</div>
            <div className="num text-[11.5px] text-white/45">
              {f.grams} g · P {f.protein} · C {f.carbs} · G {f.fat}
              {f.source === 'ai' && <span className="ml-1.5 rounded bg-neon/20 px-1 text-[9px] font-bold text-violet-200">IA</span>}
            </div>
          </button>
          <div className="num text-right">
            <span className="text-[15px] font-bold">{fmt(f.kcal)}</span>
            <span className="ml-0.5 text-[10px] text-white/35">kcal</span>
          </div>
        </div>
        {edit && (
          <div className="mt-2 flex gap-2">
            <input className="input num !py-2 text-center" inputMode="decimal" value={g} autoFocus onChange={(e) => /^\d{0,4}([.,]\d?)?$/.test(e.target.value) && setG(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && save()} aria-label="Gramos" />
            <button className="btn-primary !py-2 text-[13px]" onClick={save}>
              Ajustar gramos
            </button>
          </div>
        )}
      </motion.div>
    </motion.li>
  )
}

export function Nutrition() {
  const { state, targets, totals, aiRemaining, addFood } = useStore()
  const ui = useUI()
  const [date, setDate] = useState(todayKey())
  const [added, setAdded] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const t = totals(date)

  /** most repeated foods (last 60 days) with the amount you usually eat */
  const usual = useMemo(() => {
    const since = addDays(todayKey(), -60)
    const by = new Map<string, { n: number; last: FoodLog }>()
    for (const f of state.food) {
      if (f.date < since) continue
      const cur = by.get(f.name)
      by.set(f.name, { n: (cur?.n ?? 0) + 1, last: !cur || f.u > cur.last.u ? f : cur.last })
    }
    return [...by.values()]
      .filter((x) => x.n >= 2)
      .sort((a, b) => b.n - a.n)
      .slice(0, 8)
      .map((x) => ({ ...x.last, n: x.n }))
  }, [state.food])

  const byMeal = useMemo(() => {
    const out: Record<Meal, FoodLog[]> = { desayuno: [], comida: [], cena: [], snack: [] }
    for (const f of state.food) if (f.date === date) out[f.meal].push(f)
    for (const m of Object.keys(out) as Meal[]) out[m].sort((a, b) => a.u - b.u)
    return out
  }, [state.food, date])

  if (!targets) return null
  const budget = targets.kcal + t.burned
  const isToday = date === todayKey()

  return (
    <div className="px-4 pb-8 lg:px-0">
      <PageHeader
        title="Nutrición"
        sub={`${Math.max(0, targets.kcal - t.consumed + t.burned)} kcal disponibles`}
        right={
          <div className="flex items-center gap-1 rounded-2xl border border-white/[0.08] bg-white/[0.04] p-1" style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)' }}>
            <button className="grid h-9 w-9 place-items-center rounded-xl active:bg-white/10" aria-label="Día anterior" onClick={() => setDate(addDays(date, -1))}>
              <ChevronLeft size={18} />
            </button>
            <span className="min-w-[78px] text-center text-[13px] font-bold capitalize">{prettyDate(date)}</span>
            <button className="grid h-9 w-9 place-items-center rounded-xl active:bg-white/10 disabled:opacity-25" aria-label="Día siguiente" disabled={isToday} onClick={() => setDate(addDays(date, 1))}>
              <ChevronRight size={18} />
            </button>
          </div>
        }
      />

      <div className="space-y-4 lg:grid lg:grid-cols-12 lg:items-start lg:gap-5 lg:space-y-0">
        <MagicBar className="lg:col-span-12" suggestions={SUGGESTIONS} />

        {/* hero scan buttons */}
        <section className="grid grid-cols-2 gap-3 lg:col-span-12">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              haptic(12)
              ui.open('scan', { date })
            }}
            className="relative overflow-hidden rounded-[26px] border border-emerald/30 p-4 text-left"
            style={{ background: 'linear-gradient(145deg, rgba(16,185,129,0.28), rgba(6,182,212,0.12) 70%, rgba(11,15,23,0.9))', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.14), 0 20px 40px -18px rgba(16,185,129,0.5)' }}
          >
            <ScanBarcode size={30} className="text-emerald" strokeWidth={1.8} />
            <div className="mt-6 text-[16px] font-extrabold leading-tight">Escanear código</div>
            <span className="mt-1.5 inline-block rounded-full bg-emerald/20 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.12em] text-emerald">Gratis · Ilimitado</span>
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              haptic(12)
              ui.open('photo', { date })
            }}
            className="relative overflow-hidden rounded-[26px] border border-neon/30 p-4 text-left"
            style={{ background: 'linear-gradient(145deg, rgba(139,92,246,0.3), rgba(139,92,246,0.08) 70%, rgba(11,15,23,0.9))', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.14), 0 20px 40px -18px rgba(139,92,246,0.5)' }}
          >
            <Camera size={30} className="text-violet-300" strokeWidth={1.8} />
            <div className="mt-6 text-[16px] font-extrabold leading-tight">Foto al plato IA</div>
            <div className="mt-1.5 flex items-center gap-1.5">
              <span className="flex gap-1">
                {Array.from({ length: AI_PHOTO_LIMIT }, (_, i) => (
                  <span key={i} className={cn('h-1.5 w-4 rounded-full', i < aiRemaining ? 'bg-neon' : 'bg-white/15')} />
                ))}
              </span>
              <span className="num text-[10.5px] text-violet-200">
                {aiRemaining}/{AI_PHOTO_LIMIT} hoy
              </span>
            </div>
          </motion.button>
        </section>

        {usual.length > 0 && (
          <section className="lg:col-span-12">
            <h2 className="label mb-2 flex items-center gap-1.5 px-1 !text-emerald">
              <Sparkles size={11} /> Lo de siempre
            </h2>
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:px-0">
              {usual.map((u) => (
                <button
                  key={u.name}
                  onClick={() => {
                    haptic([12, 24, 12])
                    addFood({ date, meal: defaultMeal(), name: u.name, brand: u.brand, grams: u.grams, kcal: u.kcal, protein: u.protein, carbs: u.carbs, fat: u.fat, source: 'custom' })
                    setAdded(u.name)
                    window.setTimeout(() => setAdded(null), 1200)
                  }}
                  className="card-raised flex min-w-[150px] max-w-[190px] shrink-0 flex-col items-start gap-0.5 px-3.5 py-2.5 text-left active:scale-95"
                >
                  <span className="w-full truncate text-[13px] font-bold">{u.name}</span>
                  <span className="num text-[11px] text-white/45">
                    {u.grams} g · {u.kcal} kcal
                  </span>
                  <span className={cn('num text-[11px] font-bold', added === u.name ? 'text-emerald' : 'text-white/30')}>{added === u.name ? '✓ añadido' : `× ${u.n} veces`}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        <SuperStaples date={date} className="lg:col-span-12" />

        {/* day summary */}
        <section className="card flex items-center gap-5 p-5 lg:col-span-5">
          <Ring size={112} stroke={11} value={t.consumed / budget} gradient={['#10B981', '#06B6D4']}>
            <SpringNumber value={t.consumed} className="num text-[22px] font-bold leading-none" />
            <span className="label mt-1 !text-[8.5px]">kcal</span>
          </Ring>
          <div className="flex-1 space-y-3">
            <MacroBar label="Proteína" value={t.protein} target={targets.protein} color="#10B981" />
            <MacroBar label="Carbos" value={t.carbs} target={targets.carbs} color="#06B6D4" />
            <MacroBar label="Grasas" value={t.fat} target={targets.fat} color="#8B5CF6" />
          </div>
        </section>

        <button className="card flex w-full items-center gap-3 px-4 py-3.5 text-left transition active:scale-[0.99] lg:col-span-7" onClick={() => ui.open('search', { date })}>
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/[0.06] text-white/60">
            <Search size={19} />
          </span>
          <span className="flex-1">
            <span className="block text-[14px] font-bold">Buscar alimento</span>
            <span className="block text-[12px] text-white/40">Open Food Facts en español · comidas guardadas</span>
          </span>
          <ChevronRight size={18} className="text-white/30" />
        </button>

        {/* meals */}
        {MEALS.map((m) => {
          const list = byMeal[m.id]
          const kcal = list.reduce((a, f) => a + f.kcal, 0)
          const st = MEAL_STYLE[m.id]
          const Icon = st.icon
          const open = !collapsed[m.id]
          return (
            <section key={m.id} className="card p-3.5 lg:col-span-6">
              <div className="flex items-center gap-3">
                <button className="flex min-w-0 flex-1 items-center gap-3 text-left" aria-expanded={open} onClick={() => setCollapsed((c) => ({ ...c, [m.id]: open }))}>
                  <span className={cn('grid h-11 w-11 shrink-0 place-items-center rounded-2xl border', st.tile, st.tone)}>
                    <Icon size={20} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-extrabold leading-none">{m.label}</span>
                    <span className="num mt-1 block text-[12px] text-white/45">
                      {fmt(kcal)} kcal · {list.length} {list.length === 1 ? 'alimento' : 'alimentos'}
                    </span>
                  </span>
                  <motion.span animate={{ rotate: open ? 0 : -90 }} className="text-white/30">
                    <ChevronDown size={18} />
                  </motion.span>
                </button>
                <button
                  aria-label={`Añadir a ${m.label}`}
                  className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-xl border active:scale-90', st.tile, st.tone)}
                  onClick={() => {
                    haptic(10)
                    ui.open('search', { meal: m.id, date })
                  }}
                >
                  <Plus size={20} strokeWidth={3} />
                </button>
              </div>

              <AnimatePresence initial={false}>
                {open && list.length > 0 && (
                  <motion.ul initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mt-2.5 space-y-1.5 overflow-hidden">
                    <AnimatePresence initial={false}>
                      {list.map((f) => (
                        <Entry key={f.id} f={f} />
                      ))}
                    </AnimatePresence>
                  </motion.ul>
                )}
              </AnimatePresence>
            </section>
          )
        })}
      </div>
    </div>
  )
}
