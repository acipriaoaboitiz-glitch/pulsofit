import { useState } from 'react'
import { Check, Plus, SlidersHorizontal, ShoppingBasket } from 'lucide-react'
import { useStore } from '../lib/store'
import { useUI } from '../lib/ui'
import { macrosFor } from '../lib/off'
import { STORES, staplesFor, storeDef } from '../lib/supermarket'
import type { StapleProduct } from '../lib/supermarket'
import type { StoreId } from '../lib/types'
import { cn, defaultMeal, haptic } from '../lib/utils'

/** «Básicos de Súper»: everyday Mercadona / Lidl / Aldi / Eroski foods, one tap adds the usual portion. */
export function SuperStaples({ date, className }: { date: string; className?: string }) {
  const { addFood } = useStore()
  const ui = useUI()
  const [store, setStore] = useState<StoreId | null>(null)
  const [added, setAdded] = useState<string | null>(null)
  const list = staplesFor(store)

  const add = (p: StapleProduct) => {
    haptic([12, 24, 12])
    const g = p.servingG ?? 100
    const m = macrosFor(p.per100, g)
    addFood({ date, meal: defaultMeal(), name: p.name, brand: p.brand, grams: g, kcal: m.kcal, protein: m.protein, carbs: m.carbs, fat: m.fat, source: 'custom' })
    setAdded(p.id)
    window.setTimeout(() => setAdded((a) => (a === p.id ? null : a)), 1200)
  }

  return (
    <section className={className}>
      <div className="mb-2 flex items-center justify-between gap-3 px-1">
        <h2 className="label flex items-center gap-1.5 !text-emerald">
          <ShoppingBasket size={12} /> Básicos de Súper
        </h2>
        <span className="text-[10.5px] text-white/35">valores aprox. · escanea el código para el dato exacto</span>
      </div>

      <div className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-0.5 lg:mx-0 lg:px-0" role="tablist" aria-label="Supermercado">
        <button role="tab" aria-selected={store === null} className={cn('chip shrink-0', store === null && 'chip-on')} onClick={() => setStore(null)}>
          Todos
        </button>
        {STORES.map((s) => (
          <button key={s.id} role="tab" aria-selected={store === s.id} className={cn('chip shrink-0', store === s.id && 'chip-on')} onClick={() => setStore(store === s.id ? null : s.id)}>
            <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
            {s.label}
          </button>
        ))}
      </div>

      <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
        {list.map((p) => {
          const g = p.servingG ?? 100
          const m = macrosFor(p.per100, g)
          const def = storeDef(p.store)
          const on = added === p.id
          return (
            <li key={p.id} className="card-raised relative flex flex-col overflow-hidden">
              <button onClick={() => add(p)} className="flex flex-1 flex-col items-start gap-0.5 p-3 pb-2.5 text-left active:scale-[0.98]" aria-label={`Añadir ${p.name} (${p.brand})`}>
                <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide" style={{ color: def.color }}>
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: def.color }} />
                  {def.label}
                </span>
                <span className="mt-0.5 line-clamp-2 text-[13px] font-bold leading-tight">{p.name}</span>
                <span className="truncate text-[11px] text-white/40">{p.brand}</span>
                <span className="num mt-1.5 text-[11.5px] text-white/60">
                  {p.unit ? `${p.unit} · ` : ''}
                  {g} g
                </span>
                <span className="num text-[12px] font-bold">
                  {m.kcal} kcal <span className="font-semibold text-emerald">· P {m.protein}</span>
                </span>
              </button>
              <div className="flex items-center justify-between border-t border-white/[0.06] px-2 py-1">
                <button className="grid h-8 w-8 place-items-center rounded-lg text-white/35 active:text-white" aria-label="Ajustar cantidad" onClick={() => ui.open('product', { product: p })}>
                  <SlidersHorizontal size={14} />
                </button>
                <button onClick={() => add(p)} aria-label="Añadir" className={cn('grid h-8 w-8 place-items-center rounded-lg transition active:scale-90', on ? 'bg-emerald text-[#04130d]' : 'bg-emerald/15 text-emerald')}>
                  {on ? <Check size={16} strokeWidth={3} /> : <Plus size={16} strokeWidth={3} />}
                </button>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
