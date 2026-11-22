import type { FoodProduct, Per100, StoreId } from './types'

export interface StoreDef {
  id: StoreId
  label: string
  color: string
  /** Open Food Facts `stores` tag value */
  tag: string
  /** main private-label brand (used as a second query: many products only carry the brand) */
  brandTag: string
  /** lowercase fragments of `stores` / `brands` that identify the chain */
  keys: string[]
}

export const STORES: StoreDef[] = [
  { id: 'mercadona', label: 'Mercadona', color: '#22C55E', tag: 'Mercadona', brandTag: 'Hacendado', keys: ['mercadona', 'hacendado', 'deliplus', 'bosque verde', 'compy'] },
  { id: 'lidl', label: 'Lidl', color: '#FACC15', tag: 'Lidl', brandTag: 'Milbona', keys: ['lidl', 'milbona', 'crownfield', 'pilos', 'vita d\'or', 'deluxe', 'chef select'] },
  { id: 'aldi', label: 'Aldi', color: '#38BDF8', tag: 'Aldi', brandTag: 'Milsani', keys: ['aldi', 'milsani', 'golden fields', 'gutbio', 'mamia'] },
  { id: 'eroski', label: 'Eroski', color: '#F87171', tag: 'Eroski', brandTag: 'Eroski', keys: ['eroski', 'seleqtia', 'basic eroski'] },
]

export const storeDef = (id: StoreId): StoreDef => STORES.find((s) => s.id === id) as StoreDef

/** Which Spanish supermarket sells / owns the product, from OFF `stores` and `brands`. */
export function detectStore(stores?: string, brands?: string): StoreId | undefined {
  const hay = `${stores ?? ''},${brands ?? ''}`.toLowerCase()
  if (!hay.replace(/,/g, '').trim()) return undefined
  return STORES.find((s) => s.keys.some((k) => hay.includes(k)))?.id
}

interface Staple {
  name: string
  brand: string
  store: StoreId
  per100: Per100
  /** typical portion in grams (what one tap adds) */
  g: number
  /** label for the portion, e.g. «1 huevo» */
  unit?: string
}

const P = (kcal: number, protein: number, carbs: number, fat: number): Per100 => ({ kcal, protein, carbs, fat })

/**
 * Everyday staples from the four big Spanish chains. Values per 100 g are approximate (typical labels, from memory):
 * scan the barcode for the exact figure of the pack you bought.
 */
const STAPLES: Staple[] = [
  // ── Mercadona (Hacendado)
  { name: 'Claras de huevo líquidas', brand: 'Hacendado', store: 'mercadona', per100: P(48, 10.6, 0.5, 0.1), g: 200 },
  { name: 'Pechuga de pollo fileteada', brand: 'Hacendado', store: 'mercadona', per100: P(110, 22.5, 0, 1.8), g: 150 },
  { name: 'Yogur +Proteínas natural', brand: 'Hacendado', store: 'mercadona', per100: P(55, 10, 3.8, 0.3), g: 150 },
  { name: 'Yogur +Proteínas stracciatella', brand: 'Hacendado', store: 'mercadona', per100: P(70, 9.5, 7, 1.2), g: 150 },
  { name: 'Queso fresco batido 0%', brand: 'Hacendado', store: 'mercadona', per100: P(46, 8, 3.9, 0.2), g: 125 },
  { name: 'Atún claro al natural', brand: 'Hacendado', store: 'mercadona', per100: P(103, 24, 0, 1), g: 80, unit: '1 lata escurrida' },
  { name: 'Huevos categoría L', brand: 'Hacendado', store: 'mercadona', per100: P(143, 12.6, 0.6, 9.9), g: 60, unit: '1 huevo' },
  { name: 'Leche semidesnatada', brand: 'Hacendado', store: 'mercadona', per100: P(46, 3.2, 4.7, 1.6), g: 250, unit: '1 vaso' },
  { name: 'Leche desnatada', brand: 'Hacendado', store: 'mercadona', per100: P(34, 3.3, 4.8, 0.1), g: 250, unit: '1 vaso' },
  { name: 'Arroz basmati', brand: 'Hacendado', store: 'mercadona', per100: P(350, 8.5, 77, 0.9), g: 80, unit: 'ración en crudo' },
  { name: 'Pan de molde integral 100%', brand: 'Hacendado', store: 'mercadona', per100: P(245, 10, 40, 3.6), g: 60, unit: '2 rebanadas' },
  { name: 'Crema de cacahuete 100%', brand: 'Hacendado', store: 'mercadona', per100: P(610, 26, 10, 51), g: 20, unit: '1 cucharada' },
  { name: 'Pechuga de pavo en lonchas', brand: 'Hacendado', store: 'mercadona', per100: P(90, 17, 1.5, 1.8), g: 50 },
  { name: 'Garbanzos cocidos', brand: 'Hacendado', store: 'mercadona', per100: P(120, 7, 16, 2.5), g: 200 },
  { name: 'Aceite de oliva virgen extra', brand: 'Hacendado', store: 'mercadona', per100: P(900, 0, 0, 100), g: 10, unit: '1 cucharada' },
  // ── Lidl
  { name: 'Copos de avena', brand: 'Crownfield (Lidl)', store: 'lidl', per100: P(372, 13.5, 58.7, 7), g: 40 },
  { name: 'Skyr natural', brand: 'Milbona (Lidl)', store: 'lidl', per100: P(62, 11, 4, 0.2), g: 150 },
  { name: 'Queso fresco batido 0%', brand: 'Milbona (Lidl)', store: 'lidl', per100: P(46, 8, 3.9, 0.2), g: 125 },
  { name: 'Pechuga de pollo fileteada', brand: 'Lidl', store: 'lidl', per100: P(110, 23, 0, 1.5), g: 150 },
  { name: 'Atún claro al natural', brand: 'Nixe (Lidl)', store: 'lidl', per100: P(105, 24, 0, 1.1), g: 80, unit: '1 lata escurrida' },
  // ── Aldi
  { name: 'Copos de avena', brand: 'Aldi', store: 'aldi', per100: P(368, 13, 59, 7), g: 40 },
  { name: 'Skyr natural', brand: 'Milsani (Aldi)', store: 'aldi', per100: P(62, 11, 4, 0.2), g: 150 },
  { name: 'Yogur griego natural', brand: 'Milsani (Aldi)', store: 'aldi', per100: P(115, 5.5, 4, 8.5), g: 125, unit: '1 yogur' },
  // ── Eroski
  { name: 'Claras de huevo líquidas', brand: 'Eroski', store: 'eroski', per100: P(48, 10.6, 0.5, 0.1), g: 200 },
  { name: 'Pechuga de pollo fileteada', brand: 'Eroski', store: 'eroski', per100: P(110, 22.5, 0, 1.8), g: 150 },
  { name: 'Leche desnatada', brand: 'Eroski', store: 'eroski', per100: P(34, 3.3, 4.8, 0.1), g: 250, unit: '1 vaso' },
  { name: 'Queso batido 0%', brand: 'Eroski', store: 'eroski', per100: P(47, 8, 4, 0.2), g: 125 },
]

const slug = (s: string): string => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

export interface StapleProduct extends FoodProduct {
  store: StoreId
  /** label shown on the card, e.g. «1 huevo» */
  unit?: string
}

export const SUPER_STAPLES: StapleProduct[] = STAPLES.map((s, i) => ({
  id: `staple-${i}`,
  name: s.name,
  brand: s.brand,
  store: s.store,
  per100: s.per100,
  servingG: s.g,
  servingLabel: s.unit,
  unit: s.unit,
  source: 'custom' as const,
}))

export const staplesFor = (store: StoreId | null): StapleProduct[] => (store ? SUPER_STAPLES.filter((s) => s.store === store) : SUPER_STAPLES)

/** Staples matching a search text (accent-insensitive) and optional chain. */
export function matchStaples(q: string, store: StoreId | null): StapleProduct[] {
  const terms = slug(q).split(/\s+/).filter(Boolean)
  return staplesFor(store).filter((s) => {
    const hay = slug(`${s.name} ${s.brand ?? ''}`)
    return terms.every((t) => hay.includes(t))
  })
}
