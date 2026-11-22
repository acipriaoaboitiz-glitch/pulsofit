import type { FoodProduct, Macros, Per100, SavedFood } from './types'

const BASE = 'https://es.openfoodfacts.org'
const FIELDS =
  'code,product_name,product_name_es,brands,image_front_small_url,image_front_url,nutriscore_grade,nutriments,serving_size,serving_quantity'

interface OffNutriments {
  [k: string]: number | string | undefined
}
interface OffProduct {
  code?: string
  product_name?: string
  product_name_es?: string
  brands?: string
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
    source: 'barcode',
  }
}

export async function fetchBarcode(code: string): Promise<FoodProduct | null> {
  const clean = code.replace(/\D/g, '')
  if (clean.length < 6) return null
  const res = await fetch(`${BASE}/api/v2/product/${clean}.json?fields=${FIELDS}`)
  if (!res.ok) {
    if (res.status === 404) return null
    throw new Error(`Open Food Facts respondió ${res.status}`)
  }
  const json = (await res.json()) as { status?: number; product?: OffProduct }
  if (json.status !== 1 || !json.product) return null
  return parseProduct(json.product, clean)
}

export async function searchFoods(query: string, signal?: AbortSignal): Promise<FoodProduct[]> {
  const q = query.trim()
  if (q.length < 2) return []
  const url =
    `${BASE}/cgi/search.pl?search_terms=${encodeURIComponent(q)}` +
    `&search_simple=1&action=process&json=1&page_size=24&fields=${FIELDS}`
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`Open Food Facts respondió ${res.status}`)
  const json = (await res.json()) as { products?: OffProduct[] }
  return (json.products ?? [])
    .map((p): FoodProduct | null => {
      const parsed = parseProduct(p)
      return parsed ? { ...parsed, source: 'search' } : null
    })
    .filter((p): p is FoodProduct => p !== null && p.per100.kcal > 0)
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
