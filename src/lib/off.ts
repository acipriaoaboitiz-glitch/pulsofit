import type { FoodProduct, Macros, Per100, SavedFood, StoreId } from './types'
import { detectStore, storeDef } from './supermarket'

const BASE = 'https://es.openfoodfacts.org'
const FIELDS =
  'code,product_name,product_name_es,brands,stores,image_front_small_url,image_front_url,nutriscore_grade,nutriments,serving_size,serving_quantity'

interface OffNutriments {
  [k: string]: number | string | undefined
}
interface OffProduct {
  code?: string
  product_name?: string
  product_name_es?: string
  brands?: string
  stores?: string
  image_front_small_url?: string
  image_front_url?: string
  nutriscore_grade?: string
  nutriments?: OffNutriments
  serving_size?: string
  serving_quantity?: number | string
}

const n = (v: unknown): number => {
  const x = typeof v === 'string' ? parseFloat(v.replace(',', '.')) : (v as number)
  return Number.isFinite(x) ? x : 0
}

function parseProduct(p: OffProduct, fallbackCode?: string): FoodProduct | null {
  const nu = p.nutriments ?? {}
  let kcal = n(nu['energy-kcal_100g'])
  if (!kcal && nu['energy_100g']) kcal = n(nu['energy_100g']) / 4.184
  const per100: Per100 = {
    kcal: Math.round(kcal),
    protein: Math.round(n(nu['proteins_100g']) * 10) / 10,
    carbs: Math.round(n(nu['carbohydrates_100g']) * 10) / 10,
    fat: Math.round(n(nu['fat_100g']) * 10) / 10,
  }
  const name = (p.product_name_es || p.product_name || '').trim()
  if (!name) return null
  const serving = n(p.serving_quantity)
  return {
    id: p.code ?? fallbackCode ?? name,
    name,
    brand: p.brands?.split(',')[0]?.trim() || undefined,
    image: p.image_front_small_url || p.image_front_url || undefined,
    nutriScore: p.nutriscore_grade && /^[a-e]$/i.test(p.nutriscore_grade) ? p.nutriscore_grade.toUpperCase() : undefined,
    per100,
    servingG: serving > 0 ? serving : undefined,
    servingLabel: p.serving_size || undefined,
    store: detectStore(p.stores, p.brands),
    source: 'barcode',
  }
}

export async function fetchBarcode(code: string): Promise<FoodProduct | null> {
  const clean = code.replace(/\D/g, '')
  if (clean.length < 6) return null
  const res = await fetch(`${BASE}/api/v2/product/${clean}.json?lc=es&cc=es&fields=${FIELDS}`)
  if (!res.ok) {
    if (res.status === 404) return null
    throw new Error(`Open Food Facts respondió ${res.status}`)
  }
  const json = (await res.json()) as { status?: number; product?: OffProduct }
  if (json.status !== 1 || !json.product) return null
  return parseProduct(json.product, clean)
}

/** Open Food Facts' current search service (the old cgi/search.pl answers 503 very often). */
const SEARCH = 'https://search.openfoodfacts.org/search'
const SPAIN = 'countries:"en:spain"'

type Hit = Omit<OffProduct, 'brands' | 'stores'> & { brands?: string | string[]; stores?: string | string[] }

/** the index returns lists such as ["xx:hacendado"] */
const flat = (v: string | string[] | undefined): string | undefined => (Array.isArray(v) ? v.map((x) => x.replace(/^[a-z]{2}:/, '')).join(',') : v)

async function searchIndex(q: string, signal?: AbortSignal, byPopularity = false, spanish = true): Promise<OffProduct[]> {
  const params = new URLSearchParams({ q, page_size: '24', fields: FIELDS })
  if (spanish) params.set('langs', 'es')
  if (byPopularity) params.set('sort_by', '-unique_scans_n')
  const res = await fetch(`${SEARCH}?${params}`, { signal })
  if (!res.ok) throw new Error(`Open Food Facts respondió ${res.status}`)
  const json = (await res.json()) as { hits?: Hit[] }
  if (!Array.isArray(json.hits)) throw new Error('Respuesta inesperada de Open Food Facts')
  return json.hits.map((h) => ({ ...h, brands: flat(h.brands), stores: flat(h.stores) }))
}

/** Some index entries come without nutrients: read those few from the product database. */
async function hydrate(list: OffProduct[], signal?: AbortSignal): Promise<OffProduct[]> {
  let budget = 10
  return Promise.all(
    list.map(async (p) => {
      if (parseProduct(p)?.per100.kcal || !p.code || budget <= 0) return p
      budget -= 1
      try {
        const res = await fetch(`${BASE}/api/v2/product/${p.code}.json?lc=es&cc=es&fields=${FIELDS}`, { signal })
        const json = (await res.json()) as { product?: OffProduct }
        return json.product ? { ...json.product, code: p.code } : p
      } catch {
        return p
      }
    }),
  )
}

/** last resort when the new service is down */
async function searchLegacy(q: string, signal?: AbortSignal): Promise<OffProduct[]> {
  const url = `${BASE}/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=24&lc=es&cc=es&fields=${FIELDS}`
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`Open Food Facts respondió ${res.status}`)
  const json = (await res.json()) as { products?: OffProduct[] }
  return json.products ?? []
}

/**
 * Text search, Spain first. With `store` set it returns products of that chain (store tag or private-label brand)
 * and works without a query too.
 */
export async function searchFoods(query: string, signal?: AbortSignal, store?: StoreId | null): Promise<FoodProduct[]> {
  // strip the characters that have a meaning in the search syntax
  const q = query.replace(/[:()"\[\]{}^~*?\\!+&|/]/g, ' ').replace(/\s+/g, ' ').trim()
  if (q.length < 2 && !store) return []

  const def = store ? storeDef(store) : null
  const filter = def ? `(stores:"${def.tag.toLowerCase()}" OR brands:"${def.brandTag.toLowerCase()}")` : ''
  const compose = (...parts: string[]) => parts.filter(Boolean).join(' ')

  let raw: OffProduct[]
  try {
    raw = await searchIndex(compose(q, filter, SPAIN), signal, !q)
    if (raw.length === 0) raw = await searchIndex(compose(q, filter, SPAIN), signal, !q, false)
    // few Spanish hits: complete with the world-wide database
    if (!store && raw.length < 6) raw = [...raw, ...(await searchIndex(q, signal))]
    raw = await hydrate(raw, signal)
  } catch (e) {
    if ((e as { name?: string }).name === 'AbortError') throw e
    raw = await searchLegacy(compose(q, def?.tag ?? ''), signal)
  }

  const seen = new Set<string>()
  const out: FoodProduct[] = []
  for (const p of raw) {
    const parsed = parseProduct(p)
    if (!parsed || parsed.per100.kcal <= 0 || seen.has(parsed.id)) continue
    seen.add(parsed.id)
    out.push({ ...parsed, store: parsed.store ?? store ?? undefined, source: 'search' })
  }
  return out
}

export const savedToProduct = (s: SavedFood): FoodProduct => ({
  id: s.id,
  name: s.name,
  brand: s.brand,
  per100: { kcal: s.kcal100, protein: s.protein100, carbs: s.carbs100, fat: s.fat100 },
  servingG: s.servingG,
  source: 'custom',
})

/** Macros for `grams` of a product */
export function macrosFor(per100: Per100, grams: number): Macros {
  const k = grams / 100
  return {
    kcal: Math.round(per100.kcal * k),
    protein: Math.round(per100.protein * k * 10) / 10,
    carbs: Math.round(per100.carbs * k * 10) / 10,
    fat: Math.round(per100.fat * k * 10) / 10,
  }
}

export const NUTRI_COLORS: Record<string, string> = {
  A: '#038141',
  B: '#85BB2F',
  C: '#FECB02',
  D: '#EE8100',
  E: '#E63E11',
}
