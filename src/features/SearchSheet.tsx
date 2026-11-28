import { useEffect, useMemo, useState } from 'react'
import { Loader2, Plus, RefreshCw, Search, Sparkles, Star, Trash2, X } from 'lucide-react'
import { Sheet } from '../components/Sheet'
import { Empty } from '../components/bits'
import { NutriBadge } from './ProductSheet'
import { useStore } from '../lib/store'
import { useUI } from '../lib/ui'
import { savedToProduct, searchFoods } from '../lib/off'
import { matchScore, normalize, searchGeneric, searchLibrary, searchStaples } from '../lib/foodSearch'
import { AiLimitError, aiQuickParse } from '../lib/ai'
import { STORES, storeDef } from '../lib/supermarket'
import type { FoodProduct, StoreId } from '../lib/types'
import { cn, haptic } from '../lib/utils'

function Row({ p, onClick, onDelete }: { p: FoodProduct; onClick: () => void; onDelete?: () => void }) {
  return (
    <div className="flex items-center gap-1">
      <button onClick={onClick} className="flex min-h-[64px] min-w-0 flex-1 items-center gap-3 rounded-2xl p-2.5 text-left active:bg-white/[0.05]">
        {p.image ? (
          <img src={p.image} alt="" loading="lazy" className="h-12 w-12 shrink-0 rounded-xl bg-white object-contain p-0.5" />
        ) : (
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white/[0.05] text-xl">🍽️</div>
        )}
        <div className="min-w-0 flex-1">
          <div className="line-clamp-2 text-[14px] font-bold leading-tight">{p.name}</div>
          <div className="flex items-center gap-1.5 truncate text-[11.5px] text-white/45">
            {p.store && <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: storeDef(p.store).color }} />}
            <span className="truncate">{p.brand ?? 'Sin marca'}</span>
          </div>
          <div className="num mt-0.5 flex gap-2 text-[11px] font-bold">
            <span className="text-emerald">P {p.per100.protein}</span>
            <span className="text-aqua">C {p.per100.carbs}</span>
            <span className="text-violet-300">G {p.per100.fat}</span>
          </div>
        </div>
        <NutriBadge grade={p.nutriScore} />
        <div className="num shrink-0 text-right">
          <div className="text-[15px] font-bold">{Math.round(p.per100.kcal)}</div>
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

function Section({ title, list, onPick }: { title: string; list: FoodProduct[]; onPick: (p: FoodProduct) => void }) {
  if (!list.length) return null
  return (
    <div>
      <p className="label mb-1">{title}</p>
      <div className="-mx-2.5">
        {list.map((p) => (
          <Row key={p.id} p={p} onClick={() => onPick(p)} />
        ))}
      </div>
    </div>
  )
}

type AiState = { status: 'idle' | 'loading' | 'done'; items: FoodProduct[]; message?: string }
const NO_AI: AiState = { status: 'idle', items: [] }

function SearchBody() {
  const ui = useUI()
  const { state, removeSaved } = useStore()
  const [tab, setTab] = useState<'buscar' | 'mios'>('buscar')
  const [q, setQ] = useState('')
  const [results, setResults] = useState<FoodProduct[]>([])
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [store, setStore] = useState<StoreId | null>(null)
  const [ai, setAi] = useState<AiState>(NO_AI)

  const term = q.trim()
  const searching = term.length >= 2 || !!store

  // online part (debounced; the local results below are instant)
  useEffect(() => {
    setAi(NO_AI)
    setResults([])
    setFailed(false)
    if (term.length < 3 && !store) {
      setLoading(false)
      return
    }
    const ctl = new AbortController()
    setLoading(true)
    const t = window.setTimeout(() => {
      searchFoods(term, ctl.signal, store)
        .then((r) => {
          setResults(r)
          setLoading(false)
        })
        .catch((e: unknown) => {
          if ((e as { name?: string }).name === 'AbortError') return
          setFailed(true)
          setLoading(false)
        })
    }, 700)
    return () => {
      window.clearTimeout(t)
      ctl.abort()
    }
  }, [term, store, attempt])

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
      if (out.length >= 40) break
    }
    return out
  }, [state.food])

  /** instant results, without repeating the same food in two sections */
  const found = useMemo(() => {
    const seen = new Set<string>()
    const fresh = (list: FoodProduct[]) =>
      list.filter((p) => {
        const key = `${normalize(p.name)}|${normalize(p.brand ?? '')}|${Math.round(p.per100.kcal)}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
    const mine = store
      ? []
      : [...state.saved.map(savedToProduct), ...recents]
          .map((p) => ({ p, s: term.length >= 2 ? matchScore(term, p.name, [`${p.name} ${p.brand ?? ''}`]) : 0 }))
          .filter((x) => x.s > 0)
          .sort((a, b) => b.s - a.s)
          .slice(0, 4)
          .map((x) => x.p)
    return {
      mine: fresh(mine),
      generic: fresh(!store && term.length >= 2 ? searchGeneric(term, 10) : []),
      staples: fresh(searchStaples(term, store)),
      brands: fresh([...results, ...(term.length >= 2 ? searchLibrary(term, store) : [])]).slice(0, 40),
    }
  }, [term, store, results, recents, state.saved])

  const total = found.mine.length + found.generic.length + found.staples.length + found.brands.length

  const pick = (product: FoodProduct) => {
    haptic(8)
    ui.open('product', { product })
  }

  const askAi = async () => {
    setAi({ status: 'loading', items: [] })
    try {
      const items = await aiQuickParse(term)
      if (!items) return setAi({ status: 'done', items: [], message: 'La IA todavía no está activada.' })
      const foods = items.flatMap((it, i): FoodProduct[] => {
        if (it.kind !== 'food' || !(it.grams > 0)) return []
        const k = 100 / it.grams
        const r = (v: number) => Math.round(v * k * 10) / 10
        return [{ id: `ai-${i}-${it.name}`, name: it.name, brand: 'Estimación IA', per100: { kcal: Math.round(it.kcal * k), protein: r(it.protein), carbs: r(it.carbs), fat: r(it.fat) }, servingG: Math.round(it.grams), source: 'ai' }]
      })
      setAi({ status: 'done', items: foods, message: foods.length ? undefined : 'La IA no ha reconocido ningún alimento.' })
    } catch (e) {
      setAi({ status: 'done', items: [], message: e instanceof AiLimitError ? e.message : 'La IA no ha podido responder.' })
    }
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
            <input autoFocus className="input px-11" placeholder="Ej. yogur, pollo, pizza, lentejas…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar alimento" enterKeyHint="search" />
            {loading ? (
              <Loader2 size={18} className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-emerald" />
            ) : (
              q && (
                <button onClick={() => setQ('')} aria-label="Borrar búsqueda" className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-white/40">
                  <X size={17} />
                </button>
              )
            )}
          </div>

          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-0.5" role="tablist" aria-label="Supermercado">
            <button role="tab" aria-selected={store === null} className={cn('chip', store === null && 'chip-on')} onClick={() => setStore(null)}>
              Todos
            </button>
            {STORES.map((s) => (
              <button key={s.id} role="tab" aria-selected={store === s.id} className={cn('chip shrink-0', store === s.id && 'chip-on')} onClick={() => setStore(store === s.id ? null : s.id)}>
                <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                {s.label}
              </button>
            ))}
          </div>

          {searching ? (
            <>
              <Section title="Tuyos" list={found.mine} onPick={pick} />
              <Section title="Alimentos y platos" list={found.generic} onPick={pick} />
              <Section title="Básicos de súper" list={found.staples} onPick={pick} />
              <Section title="Productos de marca" list={found.brands} onPick={pick} />

              {loading && <p className="text-center text-[12.5px] text-white/40">Buscando más productos de marca…</p>}
              {failed && (
                <div className="flex items-center gap-3 rounded-2xl border border-fire/25 bg-fire/10 p-3">
                  <p className="min-w-0 flex-1 text-[12.5px] leading-snug text-white/70">{total ? 'Las marcas online no responden ahora; arriba tienes lo que ya tengo guardado.' : 'Open Food Facts no responde ahora mismo. Espera unos segundos y reintenta.'}</p>
                  <button className="btn-ghost shrink-0 !px-3 !py-2 text-[13px]" onClick={() => setAttempt((n) => n + 1)}>
                    <RefreshCw size={14} /> Reintentar
                  </button>
                </div>
              )}
              {!loading && !failed && total === 0 && <Empty icon={<Search size={24} />} text="Sin resultados. Prueba otra palabra, calcula con IA o créalo a mano." />}

              {term.length >= 2 && (
                <div className="space-y-2">
                  <Section title="Estimación con IA · revísala" list={ai.items} onPick={pick} />
                  {ai.message && <p className="text-center text-[12.5px] text-white/50">{ai.message}</p>}
                  {ai.status !== 'done' && (
                    <button className="btn w-full border border-neon/30 bg-neon/15 text-violet-200" disabled={ai.status === 'loading'} onClick={() => void askAi()}>
                      {ai.status === 'loading' ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                      <span className="truncate">Calcular «{term}» con IA</span>
                    </button>
                  )}
                </div>
              )}
            </>
          ) : recents.length > 0 ? (
            <Section title="Recientes" list={recents.slice(0, 12)} onPick={pick} />
          ) : (
            <Empty icon={<Search size={24} />} text="Escribe cualquier alimento, plato o marca: verás calorías, proteínas, hidratos y grasas." />
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
