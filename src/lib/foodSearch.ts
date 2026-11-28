/**
 * Instant, offline food search: the built-in catalogue, the supermarket staples and every Open Food Facts product
 * this device has already seen. Accent-insensitive, understands plurals and forgives one typo.
 */
import { FOODS_DB } from './foodsDb'
import { SUPER_STAPLES } from './supermarket'
import type { FoodProduct, StoreId } from './types'

export const normalize = (s: string): string =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9%]+/g, ' ')
    .trim()

const STOP = new Set(['de', 'del', 'con', 'y', 'en', 'el', 'la', 'los', 'las', 'al', 'a', 'un', 'una'])
const stem = (w: string): string => (w.length > 4 && w.endsWith('es') ? w.slice(0, -2) : w.length > 3 && w.endsWith('s') ? w.slice(0, -1) : w)
const words = (s: string): string[] => normalize(s).split(' ').filter((w) => w && !STOP.has(w))

/** true when the two words differ by at most one insertion, deletion or substitution */
function near(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false
  let i = 0
  let j = 0
  let edits = 0
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++
      j++
      continue
    }
    if (++edits > 1) return false
    if (a.length > b.length) i++
    else if (a.length < b.length) j++
    else {
      i++
      j++
    }
  }
  return edits + (a.length - i) + (b.length - j) <= 1
}

/** How well `query` describes a food called `name` (also known as `extra`). 0 = no match. */
export function matchScore(query: string, name: string, extra: string[] = []): number {
  const q = words(query).map(stem)
  if (q.length === 0) return 0
  const phrases = [name, ...extra]
  const full = normalize(query)
  if (phrases.some((p) => normalize(p) === full)) return 100

  const nameWords = words(name)
  const all = phrases.flatMap(words)
  const inWords = (list: string[], t: string) => list.some((w) => w.startsWith(t))
  let score = 0
  if (q.every((t) => inWords(nameWords, t))) score = 70
  else if (q.every((t) => inWords(all, t))) score = 55
  else if (q.every((t) => inWords(all, t) || (t.length >= 4 && all.some((w) => near(w.slice(0, t.length + 1), t) || near(stem(w), t))))) score = 30
  if (!score) return 0
  if (stem(nameWords[0] ?? '') === q[0]) score += 15 // «pollo» ranks «Pollo asado» above «Arroz con pollo»
  return score - Math.min(10, nameWords.length)
}

export interface Ranked {
  product: FoodProduct
  score: number
}

const rank = (list: Ranked[], limit: number): FoodProduct[] =>
  list
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.product.name.length - b.product.name.length)
    .slice(0, limit)
    .map((x) => x.product)

/** Generic foods (not tied to a brand). */
export function searchGeneric(query: string, limit = 12): FoodProduct[] {
  return rank(
    FOODS_DB.map((f) => ({
      score: matchScore(query, f.name, f.aliases),
      product: { id: `generic-${f.id}`, name: f.name, brand: 'Genérico', per100: f.per100, servingG: f.unitG ?? f.defaultG ?? 100, source: 'custom' as const },
    })),
    limit,
  )
}

export function searchStaples(query: string, store: StoreId | null, limit = 8): FoodProduct[] {
  const list = store ? SUPER_STAPLES.filter((s) => s.store === store) : SUPER_STAPLES
  if (!query.trim()) return store ? list : []
  return rank(list.map((p) => ({ product: p, score: matchScore(query, p.name, [`${p.name} ${p.brand ?? ''}`]) })), limit)
}

// ------------------------------------------------------------------ products seen on this device
const LIBRARY_KEY = 'pulso.library'
const LIBRARY_MAX = 1200

function readJson<T>(key: string, fallback: T): T {
  try {
    return (JSON.parse(localStorage.getItem(key) ?? 'null') as T) ?? fallback
  } catch {
    return fallback
  }
}
function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* storage full or blocked: the search still works online */
  }
}

/** Keeps every product that came from Open Food Facts so it can be found again instantly (and offline). */
export function rememberProducts(list: FoodProduct[]): void {
  if (!list.length) return
  const ids = new Set(list.map((p) => p.id))
  writeJson(LIBRARY_KEY, [...list, ...readJson<FoodProduct[]>(LIBRARY_KEY, []).filter((p) => !ids.has(p.id))].slice(0, LIBRARY_MAX))
}

export function searchLibrary(query: string, store: StoreId | null, limit = 20): FoodProduct[] {
  if (!query.trim()) return []
  return rank(
    readJson<FoodProduct[]>(LIBRARY_KEY, [])
      .filter((p) => !store || p.store === store)
      .map((p) => ({ product: p, score: matchScore(query, p.name, [`${p.name} ${p.brand ?? ''}`]) })),
    limit,
  )
}

// ------------------------------------------------------------------ answers of past online searches
const CACHE_KEY = 'pulso.offcache'
const CACHE_DAYS = 30
type Cache = Record<string, { t: number; items: FoodProduct[] }>

export function readQueryCache(key: string): FoodProduct[] | null {
  const hit = readJson<Cache>(CACHE_KEY, {})[key]
  return hit && Date.now() - hit.t < CACHE_DAYS * 86400000 ? hit.items : null
}
export function writeQueryCache(key: string, items: FoodProduct[]): void {
  const cache = readJson<Cache>(CACHE_KEY, {})
  cache[key] = { t: Date.now(), items }
  const keep = Object.entries(cache)
    .sort((a, b) => b[1].t - a[1].t)
    .slice(0, 50)
  writeJson(CACHE_KEY, Object.fromEntries(keep))
}
