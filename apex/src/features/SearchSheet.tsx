import { useEffect, useMemo, useState } from 'react'
import { Loader2, Plus, Search, Star, Trash2 } from 'lucide-react'
import { Sheet } from '../components/Sheet'
import { Empty } from '../components/bits'
import { NutriBadge } from './ProductSheet'
import { useStore } from '../lib/store'
import { useUI } from '../lib/ui'
import { savedToProduct, searchFoods } from '../lib/off'
import type { FoodProduct } from '../lib/types'
import { cn, haptic } from '../lib/utils'

function Row({ p, onClick, onDelete }: { p: FoodProduct; onClick: () => void; onDelete?: () => void }) {
  return (
    <div className="flex items-center gap-1">
      <button onClick={onClick} className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl p-2.5 text-left active:bg-white/[0.05]">
        {p.image ? (
          <img src={p.image} alt="" loading="lazy" className="h-12 w-12 shrink-0 rounded-xl bg-white object-contain p-0.5" />
        ) : (
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white/[0.05] text-xl">🍽️</div>
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14px] font-bold">{p.name}</div>
          <div className="truncate text-[12px] text-white/45">{p.brand ?? 'Genérico'}</div>
        </div>
        <NutriBadge grade={p.nutriScore} />
        <div className="num shrink-0 text-right">
          <div className="text-[14px] font-bold">{p.per100.kcal}</div>
          <div className="text-[10px] text-white/35">kcal/100g</div>
        </div>
      </button>
      {onDelete && (
        <button onClick={onDelete} aria-label="Eliminar" className="grid h-10 w-10 place-items-center rounded-xl text-white/30 active:text-fire">
          <Trash2 size={16} />
        </button>
      )}
    </div>
  )
}

function SearchBody() {
  const ui = useUI()
  const { state, removeSaved } = useStore()
  const [tab, setTab] = useState<'buscar' | 'mios'>('buscar')
  const [q, setQ] = useState('')
  const [results, setResults] = useState<FoodProduct[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const term = q.trim()
    if (term.length < 2) {
      setResults([])
      setError('')
      setLoading(false)
      return
    }
    const ctl = new AbortController()
    setLoading(true)
    const t = window.setTimeout(() => {
      searchFoods(term, ctl.signal)
        .then((r) => {
          setResults(r)
          setError('')
          setLoading(false)
        })
        .catch((e: unknown) => {
          if ((e as { name?: string }).name === 'AbortError') return
          setError('No se pudo buscar. Revisa tu conexión.')
          setLoading(false)
        })
    }, 450)
    return () => {
      window.clearTimeout(t)
      ctl.abort()
    }
  }, [q])

  const recents = useMemo(() => {
    const seen = new Set<string>()
    const out: FoodProduct[] = []
    for (const f of [...state.food].sort((a, b) => b.u - a.u)) {
      const key = f.name.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      const k = 100 / Math.max(1, f.grams)
      out.push({
        id: `recent-${f.id}`,
        name: f.name,
        brand: f.brand,
        image: f.image,
        per100: {
          kcal: Math.round(f.kcal * k),
          protein: Math.round(f.protein * k * 10) / 10,
          carbs: Math.round(f.carbs * k * 10) / 10,
          fat: Math.round(f.fat * k * 10) / 10,
        },
        servingG: f.grams,
        source: f.source === 'ai' ? 'custom' : f.source,
      })
      if (out.length >= 12) break
    }
    return out
  }, [state.food])

  const pick = (product: FoodProduct) => {
    haptic(8)
    ui.open('product', { product })
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(
          [
            ['buscar', 'Buscar'],
            ['mios', `Mis alimentos${state.saved.length ? ` (${state.saved.length})` : ''}`],
          ] as const
        ).map(([id, label]) => (
          <button key={id} className={cn('chip', tab === id && 'chip-on')} onClick={() => setTab(id)}>
            {id === 'mios' && <Star size={14} />}
            {label}
          </button>
        ))}
      </div>

      {tab === 'buscar' ? (
        <>
          <div className="relative">
            <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/35" />
            <input
              autoFocus
              className="input pl-11"
              placeholder="Ej. yogur natural, pechuga de pollo…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            {loading && <Loader2 size={18} className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-emerald" />}
          </div>

          {error && <p className="text-center text-[13px] text-fire">{error}</p>}

          {q.trim().length >= 2 ? (
            results.length > 0 ? (
              <div className="-mx-2.5">
                {results.map((p) => (
                  <Row key={p.id} p={p} onClick={() => pick(p)} />
                ))}
              </div>
            ) : (
              !loading &&
              !error && <Empty icon={<Search size={24} />} text="Sin resultados. Prueba otro nombre o crea el alimento a mano." />
            )
          ) : recents.length > 0 ? (
            <div>
              <p className="label mb-1">Recientes</p>
              <div className="-mx-2.5">
                {recents.map((p) => (
                  <Row key={p.id} p={p} onClick={() => pick(p)} />
                ))}
              </div>
            </div>
          ) : (
            <Empty icon={<Search size={24} />} text="Busca entre millones de productos de Open Food Facts, en español." />
          )}
        </>
      ) : (
        <>
          {state.saved.length === 0 ? (
            <Empty icon={<Star size={24} />} text="Aún no has creado comidas rápidas. Guarda tus recetas habituales para añadirlas en un toque." />
          ) : (
            <div className="-mx-2.5">
              {state.saved.map((s) => (
                <Row key={s.id} p={savedToProduct(s)} onClick={() => pick(savedToProduct(s))} onDelete={() => removeSaved(s.id)} />
              ))}
            </div>
          )}
        </>
      )}

      <button className="btn-ghost w-full" onClick={() => ui.open('custom')}>
        <Plus size={18} /> Crear alimento / comida rápida
      </button>
    </div>
  )
}

export function SearchSheet() {
  const { sheet, close } = useUI()
  const open = sheet?.name === 'search'
  return (
    <Sheet open={open} onClose={close} title="Buscar alimento" full>
      {open && <SearchBody />}
    </Sheet>
  )
}

function CustomBody() {
  const ui = useUI()
  const { saveFood } = useStore()
  const [f, setF] = useState({ name: '', kcal: '', p: '', c: '', g: '', serving: '100' })
  const num = (s: string) => {
    const n = parseFloat(s.replace(',', '.'))
    return Number.isFinite(n) && n >= 0 ? n : 0
  }
  const valid = f.name.trim().length > 0 && num(f.kcal) > 0

  const field = (k: keyof typeof f, label: string, unit: string, text = false) => (
    <label className="block">
      <span className="label">{label}</span>
      <div className="relative mt-1.5">
        <input
          className={cn('input', !text && 'num pr-12')}
          inputMode={text ? 'text' : 'decimal'}
          value={f[k]}
          placeholder={text ? 'Ej. Mi bowl de avena' : '0'}
          onChange={(e) => {
            const v = e.target.value
            if (text || /^\d{0,4}([.,]\d{0,1})?$/.test(v)) setF((x) => ({ ...x, [k]: v }))
          }}
        />
        {!text && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[13px] text-white/40">{unit}</span>}
      </div>
    </label>
  )

  return (
    <div className="space-y-4">
      {field('name', 'Nombre', '', true)}
      <p className="label !mt-5">Valores por 100 g</p>
      <div className="grid grid-cols-2 gap-3">
        {field('kcal', 'Calorías', 'kcal')}
        {field('p', 'Proteínas', 'g')}
        {field('c', 'Carbohidratos', 'g')}
        {field('g', 'Grasas', 'g')}
      </div>
      {field('serving', 'Ración habitual', 'g')}
      <button
        className="btn-primary w-full"
        disabled={!valid}
        onClick={() => {
          const saved = saveFood({
            name: f.name.trim(),
            kcal100: Math.round(num(f.kcal)),
            protein100: num(f.p),
            carbs100: num(f.c),
            fat100: num(f.g),
            servingG: num(f.serving) || 100,
          })
          haptic(20)
          ui.open('product', { product: savedToProduct(saved) })
        }}
      >
        Guardar y añadir
      </button>
    </div>
  )
}

export function CustomSheet() {
  const { sheet, close } = useUI()
  const open = sheet?.name === 'custom'
  return (
    <Sheet open={open} onClose={close} title="Nuevo alimento">
      {open && <CustomBody />}
    </Sheet>
  )
}
