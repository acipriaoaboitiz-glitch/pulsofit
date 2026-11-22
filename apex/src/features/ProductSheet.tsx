import { useEffect, useState } from 'react'
import { Check, Plus } from 'lucide-react'
import { Sheet } from '../components/Sheet'
import { Segmented } from '../components/bits'
import { useStore } from '../lib/store'
import { useUI } from '../lib/ui'
import { NUTRI_COLORS, macrosFor } from '../lib/off'
import type { FoodProduct, Meal } from '../lib/types'
import { MEALS, cn, haptic } from '../lib/utils'

export function MealPicker({ value, onChange }: { value: Meal; onChange: (m: Meal) => void }) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {MEALS.map((m) => (
        <button
          key={m.id}
          onClick={() => {
            haptic(6)
            onChange(m.id)
          }}
          className={cn(
            'rounded-2xl border py-2.5 text-center transition active:scale-95',
            value === m.id ? 'border-emerald/60 bg-emerald/12 text-emerald' : 'border-line bg-white/[0.03] text-white/60',
          )}
        >
          <div className="text-lg leading-none">{m.emoji}</div>
          <div className="mt-1 text-[11px] font-bold">{m.label}</div>
        </button>
      ))}
    </div>
  )
}

export function NutriBadge({ grade }: { grade?: string }) {
  if (!grade) return null
  return (
    <span
      className="num inline-grid h-6 min-w-6 place-items-center rounded-md px-1.5 text-[12px] font-extrabold text-black"
      style={{ background: NUTRI_COLORS[grade] ?? '#999' }}
      title={`Nutri-Score ${grade}`}
    >
      {grade}
    </span>
  )
}

function ProductBody({ product, meal: initialMeal, date, onDone }: { product: FoodProduct; meal: Meal; date: string; onDone: () => void }) {
  const { addFood } = useStore()
  const serving = product.servingG && product.servingG > 0 ? product.servingG : 100
  const [unit, setUnit] = useState<'g' | 'rac'>('g')
  const [qty, setQty] = useState<string>(String(Math.round(serving)))
  const [meal, setMeal] = useState<Meal>(initialMeal)
  const [added, setAdded] = useState(false)

  const q = parseFloat(qty.replace(',', '.'))
  const amount = Number.isFinite(q) && q > 0 ? q : 0
  const grams = unit === 'g' ? amount : amount * serving
  const m = macrosFor(product.per100, grams)

  useEffect(() => {
    setQty(unit === 'g' ? String(Math.round(serving)) : '1')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unit])

  const add = () => {
    if (grams <= 0) return
    haptic([14, 30, 14])
    addFood({
      date,
      meal,
      name: product.name,
      brand: product.brand,
      grams: Math.round(grams),
      ...m,
      source: product.source,
      image: product.image,
    })
    setAdded(true)
    window.setTimeout(onDone, 650)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4">
        {product.image ? (
          <img src={product.image} alt="" className="h-20 w-20 shrink-0 rounded-2xl bg-white object-contain p-1" />
        ) : (
          <div className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl bg-white/[0.05] text-3xl">🍽️</div>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 text-[17px] font-extrabold leading-tight">{product.name}</h3>
          {product.brand && <p className="mt-0.5 truncate text-[13px] text-white/50">{product.brand}</p>}
          <div className="mt-2 flex items-center gap-2">
            <NutriBadge grade={product.nutriScore} />
            {product.nutriScore && <span className="text-[11px] font-semibold text-white/40">Nutri-Score</span>}
          </div>
        </div>
      </div>

      <div className="card-raised p-4">
        <p className="label mb-2.5">Por 100 g</p>
        <div className="num grid grid-cols-4 gap-2 text-center">
          <Cell v={product.per100.kcal} l="kcal" c="#F4F6FA" />
          <Cell v={product.per100.protein} l="prot." c="#10B981" suffix="g" />
          <Cell v={product.per100.carbs} l="carbos" c="#F97316" suffix="g" />
          <Cell v={product.per100.fat} l="grasas" c="#8B5CF6" suffix="g" />
        </div>
      </div>

      <div className="space-y-3">
        <Segmented<'g' | 'rac'>
          value={unit}
          onChange={setUnit}
          options={[
            { id: 'g', label: 'Gramos' },
            { id: 'rac', label: `Raciones${product.servingG ? ` (${Math.round(serving)} g)` : ''}` },
          ]}
        />
        <div className="flex items-center gap-2">
          <input
            className="input num text-center text-2xl font-bold"
            inputMode="decimal"
            value={qty}
            onChange={(e) => /^\d{0,4}([.,]\d{0,1})?$/.test(e.target.value) && setQty(e.target.value)}
            aria-label="Cantidad"
          />
        </div>
        <div className="flex gap-2">
          {(unit === 'g' ? [50, 100, 150, 200, 250] : [0.5, 1, 1.5, 2]).map((v) => (
            <button key={v} className="chip flex-1 justify-center" onClick={() => setQty(String(v))}>
              {v}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-emerald/25 bg-emerald/[0.07] p-4">
        <div className="flex items-baseline justify-between">
          <span className="label !text-emerald/80">Aportas</span>
          <span className="num text-[12px] text-white/45">{Math.round(grams)} g</span>
        </div>
        <div className="num mt-1 flex items-baseline gap-1">
          <span className="text-[34px] font-bold leading-none">{m.kcal}</span>
          <span className="text-sm text-white/45">kcal</span>
          <span className="ml-auto text-[13px] text-white/60">
            P <b className="text-emerald">{m.protein}</b> · C <b className="text-fire">{m.carbs}</b> · G{' '}
            <b className="text-neon">{m.fat}</b>
          </span>
        </div>
      </div>

      <MealPicker value={meal} onChange={setMeal} />

      <button className="btn-primary w-full" disabled={grams <= 0 || added} onClick={add}>
        {added ? (
          <>
            <Check size={20} strokeWidth={3} /> Añadido
          </>
        ) : (
          <>
            <Plus size={20} strokeWidth={3} /> Añadir a {MEALS.find((x) => x.id === meal)?.label}
          </>
        )}
      </button>
    </div>
  )
}

function Cell({ v, l, c, suffix }: { v: number; l: string; c: string; suffix?: string }) {
  return (
    <div>
      <div className="text-lg font-bold" style={{ color: c }}>
        {v}
        {suffix && <span className="text-[11px] text-white/35">{suffix}</span>}
      </div>
      <div className="text-[11px] font-semibold text-white/40">{l}</div>
    </div>
  )
}

export function ProductSheet() {
  const { sheet, close } = useUI()
  const open = sheet?.name === 'product' && !!sheet.product
  return (
    <Sheet open={open} onClose={close} title="Añadir alimento">
      {open && sheet?.product && (
        <ProductBody key={sheet.product.id} product={sheet.product} meal={sheet.meal} date={sheet.date} onDone={close} />
      )}
    </Sheet>
  )
}
