import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Camera, ChevronLeft, ChevronRight, Plus, ScanBarcode, Search, Trash2 } from 'lucide-react'
import { useStore } from '../lib/store'
import { useUI } from '../lib/ui'
import { MEALS, addDays, fmt, haptic, prettyDate, todayKey } from '../lib/utils'
import type { FoodLog, Meal } from '../lib/types'
import { MacroBar, PageHeader } from '../components/bits'
import { Ring } from '../components/Ring'
import { MagicBar } from '../features/MagicBar'
import { Sparkles } from 'lucide-react'
import { defaultMeal } from '../lib/utils'

function Entry({ f }: { f: FoodLog }) {
  const { updateFood, removeFood } = useStore()
  const [edit, setEdit] = useState(false)
  const [g, setG] = useState(String(f.grams))

  const save = () => {
    const n = parseFloat(g.replace(',', '.'))
    if (Number.isFinite(n) && n > 0 && f.grams > 0) {
      const k = n / f.grams
      updateFood(f.id, {
        grams: Math.round(n),
        kcal: Math.round(f.kcal * k),
        protein: Math.round(f.protein * k * 10) / 10,
        carbs: Math.round(f.carbs * k * 10) / 10,
        fat: Math.round(f.fat * k * 10) / 10,
      })
      haptic(10)
    }
    setEdit(false)
  }

  return (
    <motion.li layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -30 }} className="py-2.5">
      <div className="flex items-center gap-3">
        <button
          className="min-w-0 flex-1 text-left"
          onClick={() => {
            setG(String(f.grams))
            setEdit((e) => !e)
          }}
        >
          <div className="truncate text-[14px] font-bold">{f.name}</div>
          <div className="num text-[12px] text-white/45">
            {f.grams} g · P {f.protein} · C {f.carbs} · G {f.fat}
            {f.source === 'ai' && <span className="ml-1.5 rounded bg-neon/20 px-1 text-[10px] font-bold text-neon">IA</span>}
          </div>
        </button>
        <div className="num text-right">
          <span className="text-[15px] font-bold">{fmt(f.kcal)}</span>
          <span className="ml-0.5 text-[11px] text-white/35">kcal</span>
        </div>
        <button
          aria-label={`Eliminar ${f.name}`}
          onClick={() => {
            haptic(10)
            removeFood(f.id)
          }}
          className="grid h-9 w-9 place-items-center rounded-xl text-white/30 active:text-fire"
        >
          <Trash2 size={16} />
        </button>
      </div>
      {edit && (
        <div className="mt-2 flex gap-2">
          <input
            className="input num !py-2 text-center"
            inputMode="decimal"
            value={g}
            autoFocus
            onChange={(e) => /^\d{0,4}([.,]\d?)?$/.test(e.target.value) && setG(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && save()}
          />
          <button className="btn-primary !py-2" onClick={save}>
            Ajustar gramos
          </button>
        </div>
      )}
    </motion.li>
  )
}

export function Nutrition() {
  const { state, targets, totals, aiRemaining, addFood } = useStore()
  const [added, setAdded] = useState<string | null>(null)
  const ui = useUI()
  const [date, setDate] = useState(todayKey())
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
    return [...by.values()].filter((x) => x.n >= 2).sort((a, b) => b.n - a.n).slice(0, 8).map((x) => ({ ...x.last, n: x.n }))
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
    <div className="px-4 pb-8">
      <PageHeader
        title="Nutrición"
        right={
          <div className="flex items-center gap-1 rounded-2xl border border-line bg-card p-1">
            <button className="grid h-9 w-9 place-items-center rounded-xl active:bg-white/10" aria-label="Día anterior" onClick={() => setDate(addDays(date, -1))}>
              <ChevronLeft size={18} />
            </button>
            <span className="min-w-[78px] text-center text-[13px] font-bold capitalize">{prettyDate(date)}</span>
            <button
              className="grid h-9 w-9 place-items-center rounded-xl active:bg-white/10 disabled:opacity-25"
              aria-label="Día siguiente"
              disabled={isToday}
              onClick={() => setDate(addDays(date, 1))}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        }
      />

      <div className="space-y-4">
        <MagicBar />

        {usual.length > 0 && (
          <section>
            <h2 className="label mb-2 flex items-center gap-1.5 px-1 !text-emerald">
              <Sparkles size={12} /> Lo de siempre
            </h2>
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
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
                  <span className={`num text-[11px] font-bold ${added === u.name ? 'text-emerald' : 'text-white/30'}`}>{added === u.name ? '✓ añadido' : `× ${u.n} veces`}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        <section className="card flex items-center gap-5 p-5">
          <Ring size={104} stroke={10} value={t.consumed / budget} color="#10B981">
            <span className="num text-xl font-bold">{fmt(t.consumed)}</span>
            <span className="text-[10px] font-bold uppercase text-white/40">kcal</span>
          </Ring>
          <div className="flex-1 space-y-3">
            <MacroBar label="Proteínas" value={t.protein} target={targets.protein} color="#10B981" />
            <MacroBar label="Carbos" value={t.carbs} target={targets.carbs} color="#F97316" />
            <MacroBar label="Grasas" value={t.fat} target={targets.fat} color="#8B5CF6" />
          </div>
        </section>

        <section className="grid grid-cols-3 gap-2.5">
          <button
            className="card flex flex-col items-center gap-2 py-4 active:scale-95"
            onClick={() => {
              haptic(10)
              ui.open('scan', { date })
            }}
          >
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald text-[#04130d]">
              <ScanBarcode size={22} />
            </span>
            <span className="text-[12px] font-bold">Escanear</span>
          </button>
          <button
            className="card relative flex flex-col items-center gap-2 py-4 active:scale-95"
            onClick={() => {
              haptic(10)
              ui.open('photo', { date })
            }}
          >
            <span className="absolute right-2 top-2 rounded-full bg-neon/20 px-1.5 py-0.5 text-[10px] font-bold text-neon num">
              {aiRemaining}/3
            </span>
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-neon text-white">
              <Camera size={22} />
            </span>
            <span className="text-[12px] font-bold">Foto IA</span>
          </button>
          <button
            className="card flex flex-col items-center gap-2 py-4 active:scale-95"
            onClick={() => {
              haptic(10)
              ui.open('search', { date })
            }}
          >
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/10">
              <Search size={22} />
            </span>
            <span className="text-[12px] font-bold">Buscar</span>
          </button>
        </section>

        {MEALS.map((m) => {
          const list = byMeal[m.id]
          const kcal = list.reduce((a, f) => a + f.kcal, 0)
          return (
            <section key={m.id} className="card p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">{m.emoji}</span>
                  <div>
                    <h3 className="text-[15px] font-extrabold leading-none">{m.label}</h3>
                    <span className="num text-[12px] text-white/40">{fmt(kcal)} kcal</span>
                  </div>
                </div>
                <button
                  aria-label={`Añadir a ${m.label}`}
                  className="grid h-10 w-10 place-items-center rounded-xl bg-emerald/15 text-emerald active:scale-90"
                  onClick={() => {
                    haptic(10)
                    ui.open('search', { meal: m.id, date })
                  }}
                >
                  <Plus size={20} strokeWidth={3} />
                </button>
              </div>
              {list.length > 0 && (
                <ul className="mt-2 divide-y divide-line">
                  <AnimatePresence initial={false}>
                    {list.map((f) => (
                      <Entry key={f.id} f={f} />
                    ))}
                  </AnimatePresence>
                </ul>
              )}
            </section>
          )
        })}
      </div>
    </div>
  )
}
