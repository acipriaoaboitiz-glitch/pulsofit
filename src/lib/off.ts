import type { FoodProduct, Macros, Per100, SavedFood, StoreId } from './types'
import { detectStore, storeDef } from './supermarket'
import { readQueryCache, rememberProducts, writeQueryCache } from './foodSearch'

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
  const found = parseProduct(json.product, clean)
  if (found) rememberProducts([found])
  return found
}

/**
 * Text search. The classic endpoint is the one that returns nutrients, but it often answers 503, so it is retried.
 * If it stays down, the new search service finds the products and their nutrients are read one by one.
 */
const SEARCH = 'https://search.openfoodfacts.org/search'

const sleep = (ms: number, signal?: AbortSignal): Promise<void> =>
  new Promise((resolve, reject) => {
    const abort = () => {
      window.clearTimeout(t)
      reject(new DOMException('Aborted', 'AbortError'))
    }
    const t = window.setTimeout(() => {
      signal?.removeEventListener('abort', abort)
      resolve()
    }, ms)
    signal?.addEventListener('abort', abort, { once: true })
  })

async function classicSearch(q: string, spain: boolean, store: StoreId | null, signal?: AbortSignal): Promise<OffProduct[]> {
  let url = `${BASE}/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=30&sort_by=unique_scans_n&lc=es&cc=es&fields=${FIELDS}`
  const tags: [string, string][] = []
  if (spain) tags.push(['countries', 'spain'])
  if (store) tags.push(['stores', storeDef(store).tag])
  tags.forEach(([type, value], i) => {
    url += `&tagtype_${i}=${type}&tag_contains_${i}=contains&tag_${i}=${encodeURIComponent(value)}`
  })

  let last: unknown
  for (const wait of [0, 700, 2000]) {
    if (wait) await sleep(wait, signal)
    try {
      const res = await fetch(url, { signal })
      if (!res.ok) throw new Error(`Open Food Facts respondió ${res.status}`)
      const json = (await res.json()) as { products?: OffProduct[] }
      return json.products ?? []
    } catch (e) {
      if ((e as { name?: string }).name === 'AbortError') throw e
      last = e // 503 pages come without CORS headers and show up as a network error
    }
  }
  throw last
}

async function indexSearch(q: string, store: StoreId | null, signal?: AbortSignal): Promise<OffProduct[]> {
  const def = store ? storeDef(store) : null
  const filter = def ? `(stores:"${def.tag.toLowerCase()}" OR brands:"${def.brandTag.toLowerCase()}") ` : ''
  const params = new URLSearchParams({ q: `${q} ${filter}countries:"en:spain"`.trim(), page_size: '10', langs: 'es' })
  const res = await fetch(`${SEARCH}?${params}`, { signal })
  if (!res.ok) throw new Error(`Open Food Facts respondió ${res.status}`)
  const json = (await res.json()) as { hits?: { code?: string }[] }
  const full = await Promise.all(
    (json.hits ?? []).slice(0, 8).map(async (h) => {
      if (!h.code) return null
      try {
        const r = await fetch(`${BASE}/api/v2/product/${h.code}.json?lc=es&cc=es&fields=${FIELDS}`, { signal })
        const j = (await r.json()) as { product?: OffProduct }
        return j.product ? { ...j.product, code: h.code } : null
      } catch {
        return null
      }
    }),
  )
  return full.filter((p) => p !== null)
}

function toProducts(raw: OffProduct[], store: StoreId | null): FoodProduct[] {
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

/**
 * Online search, Spain first. With `store` set it returns that chain's products and works without a query too.
 * Answers are cached for a month and every product is remembered for the instant search.
 */
export async function searchFoods(query: string, signal?: AbortSignal, store: StoreId | null = null): Promise<FoodProduct[]> {
  const q = query.replace(/[:()"\[\]{}^~*?\\!+&|/]/g, ' ').replace(/\s+/g, ' ').trim()
  if (q.length < 2 && !store) return []

  const key = `${store ?? ''}|${q.toLowerCase()}`
  const cached = readQueryCache(key)
  if (cached) return cached

  let out: FoodProduct[]
  try {
    out = toProducts(await classicSearch(q, true, store, signal), store)
    // nothing sold in Spain: look in the world-wide database (one extra request, the service limits how many we can make)
    if (!store && out.length === 0) out = toProducts(await classicSearch(q, false, null, signal), null)
  } catch (e) {
    if ((e as { name?: string }).name === 'AbortError') throw e
    out = toProducts(await indexSearch(q, store, signal), store)
    if (out.length === 0) throw e
    rememberProducts(out)
    return out // partial answer: do not cache it
  }

  if (out.length) {
    writeQueryCache(key, out)
    rememberProducts(out)
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
