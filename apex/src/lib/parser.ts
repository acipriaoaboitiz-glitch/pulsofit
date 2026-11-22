/**
 * Parser local de la Barra Mágica: lenguaje natural → alimentos, series de gimnasio, agua, pasos y cardio.
 * Módulo puro (solo `import type`): funciona offline, sin gastar cuota de IA y se puede probar en Node.
 */
import type { CardioKind, Muscle, Per100 } from './types'

export interface DbFoodLike {
  id: string
  name: string
  aliases: string[]
  per100: Per100
  unitG?: number
  defaultG?: number
}
export interface ExerciseRef {
  id: string
  name: string
  muscle: Muscle
}
export interface ParseCtx {
  exercises: ExerciseRef[]
  foods: DbFoodLike[]
}

export interface FoodItem {
  kind: 'food'
  name: string
  grams: number
  kcal: number
  protein: number
  carbs: number
  fat: number
}
export interface ExerciseItem {
  kind: 'exercise'
  /** undefined → ejercicio nuevo que se creará como personalizado */
  exerciseId?: string
  name: string
  muscle: Muscle
  sets: { kg: number; reps: number }[]
}
export interface WaterItem {
  kind: 'water'
  ml: number
}
export interface StepsItem {
  kind: 'steps'
  steps: number
}
export interface CardioItem {
  kind: 'cardio'
  cardio: CardioKind
  minutes: number
}
export type MagicItem = FoodItem | ExerciseItem | WaterItem | StepsItem | CardioItem

export interface MagicResult {
  items: MagicItem[]
  /** trozos que no se han podido interpretar (candidatos a «Mejorar con IA») */
  unknown: string[]
}

// ------------------------------------------------------------------ helpers
export const norm = (s: string): string =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/(\d),(\d)/g, '$1.$2')
    .replace(/[×*]/g, 'x')
    .replace(/\s+/g, ' ')
    .trim()

const esc = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const NUM = '(\\d+(?:\\.\\d+)?)'
const r1 = (n: number): number => Math.round(n * 10) / 10

const COUNT_WORDS: Record<string, number> = { un: 1, una: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, medio: 0.5, media: 0.5 }

/** gramos por unidad de medida hablada cuando el alimento no tiene `unitG` */
const MEASURE_G: Record<string, number> = {
  cucharada: 12, cucharadas: 12, cucharadita: 5, cucharaditas: 5, vaso: 200, vasos: 200, taza: 200, tazas: 200, lata: 330, latas: 330,
  puñado: 30, punado: 30, punados: 30, loncha: 20, lonchas: 20, rebanada: 30, rebanadas: 30, rodaja: 15, rodajas: 15, filete: 150, filetes: 150,
  trozo: 50, trozos: 50, racion: 150, raciones: 150, porcion: 150, porciones: 150, scoop: 30, cacito: 30,
}
const MEASURE_RE = Object.keys(MEASURE_G).map(esc).join('|')
const UNIT_WORDS = '(?:unidad(?:es)?|ud|uds|pieza(?:s)?)'

// ------------------------------------------------------------------ water / steps / cardio
function parseWater(t: string): WaterItem | null {
  if (!/\bagua\b/.test(t)) return null
  const m = new RegExp(`${NUM}\\s*(ml|cl|l|litros?)\\b`).exec(t)
  if (m) {
    const v = parseFloat(m[1]!)
    const u = m[2]!
    const ml = u === 'ml' ? v : u === 'cl' ? v * 10 : v * 1000
    return { kind: 'water', ml: Math.round(ml) }
  }
  if (/\bbotella\b/.test(t)) return { kind: 'water', ml: 500 }
  if (/\bvaso\b/.test(t)) return { kind: 'water', ml: 250 }
  return null
}

function parseSteps(t: string): StepsItem | null {
  const m = /(\d{1,3}(?:\.\d{3})+|\d+)\s*pasos\b/.exec(t)
  if (!m) return null
  const steps = parseInt(m[1]!.replace(/\./g, ''), 10)
  return steps > 0 ? { kind: 'steps', steps } : null
}

const CARDIO_WORDS: [RegExp, CardioKind][] = [
  [/\b(corr\w*|footing|trote)\b/, 'run'],
  [/\b(camin\w*|paseo|andar)\b/, 'walk'],
  [/\b(bici\w*|ciclismo|spinning)\b/, 'bike'],
  [/\b(elipti\w*)\b/, 'elliptical'],
  [/\b(nata\w*|nado|nade|piscina)\b/, 'swim'],
  [/\b(futbol|deporte|padel|tenis|baloncesto|basket)\b/, 'sport'],
]

function parseCardio(t: string): CardioItem | null {
  const kind = CARDIO_WORDS.find(([re]) => re.test(t))?.[1]
  if (!kind) return null
  const m = new RegExp(`${NUM}\\s*(min\\w*|h|horas?)\\b`).exec(t)
  if (!m) return null
  const v = parseFloat(m[1]!)
  const minutes = /^h/.test(m[2]!) ? Math.round(v * 60) : Math.round(v)
  return minutes > 0 ? { kind: 'cardio', cardio: kind, minutes } : null
}

// ------------------------------------------------------------------ exercises
const EXPLICIT_ALIASES: Record<string, string[]> = {
  'bench-press': ['press banca', 'press de banca', 'banca', 'bench press', 'bench'],
  squat: ['sentadilla', 'sentadillas', 'squat'],
  deadlift: ['peso muerto'],
  rdl: ['peso muerto rumano', 'rumano'],
  'db-curl': ['curl biceps', 'curl de biceps', 'curl con mancuernas', 'curl'],
  'barbell-curl': ['curl con barra', 'curl barra'],
  'hammer-curl': ['curl martillo'],
  ohp: ['press militar', 'press hombro con barra'],
  'db-shoulder': ['press hombro', 'press de hombro', 'press de hombros'],
  'lat-pulldown': ['jalon', 'jalon al pecho', 'polea al pecho'],
  pullup: ['dominadas', 'dominada', 'pull up'],
  pushup: ['flexiones', 'flexion', 'push up'],
  'leg-press': ['prensa', 'prensa de piernas'],
  'hip-thrust': ['hip thrust', 'empuje de cadera'],
  'lateral-raise': ['elevaciones laterales', 'laterales'],
  plank: ['plancha'],
  crunch: ['crunch', 'abdominales'],
  'barbell-row': ['remo con barra', 'remo'],
  'dips-chest': ['fondos', 'fondos paralelas'],
  'incline-bench': ['press inclinado', 'press banca inclinado', 'banca inclinada'],
  'incline-db': ['press inclinado con mancuernas'],
}

const AUTO_SUFFIX = /\s+(?:con|en)\s+(?:barra z|barra|mancuernas?|polea|maquina|cuerda|banco|paralelas)$|\s*\(maquina\)$/

interface Alias {
  id: string
  alias: string
}

export function buildExerciseIndex(exercises: ExerciseRef[]): Alias[] {
  const out: Alias[] = []
  const seen = new Set<string>()
  const push = (id: string, a: string): void => {
    const n = norm(a)
    if (n.length < 3 || seen.has(n)) return
    seen.add(n)
    out.push({ id, alias: n })
  }
  const ids = new Set(exercises.map((e) => e.id))
  for (const [id, list] of Object.entries(EXPLICIT_ALIASES)) if (ids.has(id)) for (const a of list) push(id, a)
  for (const e of exercises) push(e.id, e.name)
  for (const e of exercises) push(e.id, norm(e.name).replace(AUTO_SUFFIX, ''))
  return out.sort((a, b) => b.alias.length - a.alias.length)
}

const MUSCLE_GUESS: [RegExp, Muscle][] = [
  [/curl|biceps/, 'Bíceps'],
  [/triceps|fondos|extension|frances/, 'Tríceps'],
  [/hombro|militar|lateral|pajaro|elevacion/, 'Hombros'],
  [/remo|dominada|jalon|espalda|peso muerto|pullover/, 'Espalda'],
  [/sentadilla|prensa|zancada|cuadriceps|extension de pierna/, 'Cuádriceps'],
  [/femoral|isquio|rumano/, 'Isquios'],
  [/gluteo|hip thrust|patada/, 'Glúteos'],
  [/gemelo|pantorrilla/, 'Gemelos'],
  [/abdominal|plancha|crunch|core|giro/, 'Core'],
  [/press|pecho|apertura|banca|flexion|cruce/, 'Pecho'],
]
const guessMuscle = (n: string): Muscle => MUSCLE_GUESS.find(([re]) => re.test(n))?.[1] ?? 'Core'

function titleCase(s: string): string {
  const t = s.trim()
  return t ? t[0]!.toUpperCase() + t.slice(1) : t
}

function parseExercise(t: string, ctx: ParseCtx, index: Alias[]): ExerciseItem | null {
  const hasSetToken = new RegExp(`\\d+\\s*x\\s*${NUM}`).test(t) || /\b\d+\s*(?:series?|sets?)\b/.test(t)
  if (!hasSetToken) return null

  // 1. which exercise?
  let id: string | undefined
  let rest = t
  for (const a of index) {
    const re = new RegExp(`(^|\\s)${esc(a.alias)}(?=\\s|$|[:,.\\d])`)
    const m = re.exec(t)
    if (m) {
      // «remo con cable en V» no es «remo»: si sobran palabras de nombre, es un ejercicio nuevo
      const words = (t.slice(0, m.index) + ' ' + t.slice(m.index + m[0].length))
        .replace(/\d+(?:\.\d+)?\s*(?:kg|k)?/g, ' ')
        .replace(/\b(x|series?|sets?|de|con|en|y|barra|mancuernas?|polea|maquina|el|la|mi|hoy|hice|he|hecho|libre|kg)\b/g, ' ')
        .replace(/[^a-z ]/g, ' ')
        .split(' ')
        .filter((w) => w.length >= 2)
      if (words.length > 0) break
      id = a.id
      rest = (t.slice(0, m.index) + ' ' + t.slice(m.index + m[0].length)).trim()
      break
    }
  }
  let newName: string | undefined
  if (!id) {
    const first = /\d/.exec(t)
    const nm = (first ? t.slice(0, first.index) : t).replace(/\b(series?|sets?|de|con)\b/g, ' ').replace(/[:,]/g, ' ').trim()
    if (nm.length < 3) return null
    newName = titleCase(nm)
    rest = first ? t.slice(first.index) : ''
  }

  // 2. sets
  const tokenRe = new RegExp(`(\\d+)\\s*x\\s*${NUM}\\s*(kg|k)?\\b`, 'g')
  const tokens = [...rest.matchAll(tokenRe)].map((m) => ({ a: parseInt(m[1]!, 10), b: parseFloat(m[2]!), kg: Boolean(m[3]) }))
  const stripped = rest.replace(tokenRe, ' ')
  const declared = (() => {
    const m = /\b(\d+)\s*(?:series?|sets?)\b/.exec(stripped)
    return m ? parseInt(m[1]!, 10) : 0
  })()
  const noDecl = stripped.replace(/\b\d+\s*(?:series?|sets?)\b/g, ' ')
  const loose = new RegExp(`(?:^|[^\\d.x])${NUM}\\s*(kg|k)?\\b`).exec(noDecl)
  const looseKg = loose ? parseFloat(loose[1]!) : null

  let sets: { kg: number; reps: number }[] = []
  if (tokens.length >= 2) {
    sets = tokens.map((k) => ({ reps: k.a, kg: k.b }))
    while (declared && sets.length < declared) sets.push({ ...sets[sets.length - 1]! })
  } else if (tokens.length === 1) {
    const k = tokens[0]!
    if (k.kg || (declared && looseKg === null)) {
      // reps × kg
      const n = declared || 1
      sets = Array.from({ length: n }, () => ({ reps: k.a, kg: k.b }))
    } else {
      // series × reps (+ peso suelto)
      sets = Array.from({ length: Math.min(20, k.a) }, () => ({ reps: k.b, kg: looseKg ?? 0 }))
    }
  } else if (declared) {
    sets = Array.from({ length: declared }, () => ({ reps: 8, kg: looseKg ?? 0 }))
  }
  sets = sets.filter((s) => s.reps > 0 && s.reps <= 200 && s.kg >= 0 && s.kg <= 1000).slice(0, 20)
  if (sets.length === 0) return null

  const ref = id ? ctx.exercises.find((e) => e.id === id) : undefined
  return { kind: 'exercise', exerciseId: ref?.id, name: ref?.name ?? newName ?? 'Ejercicio', muscle: ref?.muscle ?? guessMuscle(norm(newName ?? '')), sets }
}

// ------------------------------------------------------------------ foods
interface FoodMatch {
  food: DbFoodLike
  start: number
  end: number
}

function findFoods(t: string, foods: DbFoodLike[]): FoodMatch[] {
  const idx: { food: DbFoodLike; alias: string }[] = []
  for (const f of foods) for (const a of [f.name, ...f.aliases]) idx.push({ food: f, alias: norm(a) })
  idx.sort((a, b) => b.alias.length - a.alias.length)
  const taken = new Array<boolean>(t.length).fill(false)
  const out: FoodMatch[] = []
  for (const { food, alias } of idx) {
    if (alias.length < 3) continue
    const re = new RegExp(`(^|[^a-z])(${esc(alias)})(?![a-z])`, 'g')
    for (const m of t.matchAll(re)) {
      const start = m.index + m[1]!.length
      const end = start + alias.length
      if (taken.slice(start, end).some(Boolean)) continue
      for (let i = start; i < end; i++) taken[i] = true
      out.push({ food, start, end })
    }
  }
  return out.sort((a, b) => a.start - b.start)
}

const FILLER = '(?:de|del|unos|unas|con|y|e)'

function leftQuantity(seg: string, food: DbFoodLike): number | null {
  const s = seg.replace(new RegExp(`(?:\\s+${FILLER})+\\s*$`), (m) => (/\bde\b|\bdel\b/.test(m) ? ' de ' : ' ')).trim()
  // 200 g / 1.5 kg / 250 ml
  const g = new RegExp(`${NUM}\\s*(kg|g|gr|gramos?|ml|cl|l|litros?)\\s*(?:de|del)?$`).exec(s)
  if (g) {
    const v = parseFloat(g[1]!)
    const u = g[2]!
    return u === 'kg' || u === 'l' || /^litro/.test(u) ? v * 1000 : u === 'cl' ? v * 10 : v
  }
  // N <medida> (de) | un/dos/medio … (unidad de)
  const m = new RegExp(`(${NUM}|${Object.keys(COUNT_WORDS).join('|')})\\s*(?:(${MEASURE_RE})|${UNIT_WORDS})?\\s*(?:de|del)?$`).exec(s)
  if (m) {
    const qty = COUNT_WORDS[m[1]!] ?? parseFloat(m[1]!)
    if (!Number.isFinite(qty)) return null
    const measure = m[3]
    const unit = measure ? (/^(?:vasos?|tazas?)$/.test(measure) && food.unitG ? food.unitG : food.unitG && !/^(?:cucharad|punad|loncha|rebanada|rodaja|filete|trozo)/.test(measure) ? food.unitG : MEASURE_G[measure]!) : (food.unitG ?? food.defaultG ?? 100)
    return qty * unit
  }
  return null
}

function rightQuantity(seg: string): { grams: number; len: number } | null {
  const m = new RegExp(`^\\s*(?:\\(|de\\s+)?${NUM}\\s*(kg|g|gr|gramos?|ml)\\b\\)?`).exec(seg)
  if (!m) return null
  const v = parseFloat(m[1]!)
  return { grams: m[2] === 'kg' ? v * 1000 : v, len: m[0].length }
}

function parseFoods(t: string, ctx: ParseCtx): { items: FoodItem[]; unknown: string[] } {
  const matches = findFoods(t, ctx.foods)
  const items: FoodItem[] = []
  const covered = new Array<boolean>(t.length).fill(false)
  let consumedUntil = 0
  matches.forEach((m, i) => {
    const nextStart = matches[i + 1]?.start ?? t.length
    const left = t.slice(consumedUntil, m.start)
    let grams = leftQuantity(left, m.food)
    let used = 0
    if (grams === null) {
      const rq = rightQuantity(t.slice(m.end, nextStart))
      if (rq) {
        grams = rq.grams
        used = rq.len
      }
    }
    if (grams === null) grams = m.food.unitG ? m.food.unitG : (m.food.defaultG ?? 100)
    grams = Math.round(grams)
    const k = grams / 100
    items.push({
      kind: 'food',
      name: m.food.name,
      grams,
      kcal: Math.round(m.food.per100.kcal * k),
      protein: r1(m.food.per100.protein * k),
      carbs: r1(m.food.per100.carbs * k),
      fat: r1(m.food.per100.fat * k),
    })
    for (let j = consumedUntil; j < m.end + used; j++) covered[j] = true
    consumedUntil = m.end + used
  })
  // leftover words that look like food names we don't know
  const leftover = [...t].map((c, i) => (covered[i] ? ' ' : c)).join('')
  const STOP = new Set(['de', 'del', 'con', 'y', 'e', 'un', 'una', 'uno', 'unos', 'unas', 'el', 'la', 'los', 'las', 'g', 'gr', 'gramos', 'kg', 'ml', 'he', 'comido', 'comi', 'cene', 'desayune', 'almorce', 'tome', 'hoy', 'para', 'mi', 'en', 'al', 'a', 'dos', 'tres', 'medio', 'media'])
  const unknown = leftover
    .split(/[,;+]|\s+y\s+|\s+con\s+/)
    .map((s) => s.replace(/\d+(?:\.\d+)?\s*(?:kg|g|gr|gramos?|ml)?/g, ' ').trim())
    .map((s) => s.split(' ').filter((w) => w && !STOP.has(w) && w.length > 2).join(' '))
    .filter(Boolean)
  return { items, unknown }
}

// ------------------------------------------------------------------ entry point
export function parseMagic(raw: string, ctx: ParseCtx): MagicResult {
  const t = norm(raw)
  if (!t) return { items: [], unknown: [] }

  const water = parseWater(t)
  if (water) return { items: [water], unknown: [] }
  const steps = parseSteps(t)
  if (steps) return { items: [steps], unknown: [] }
  const cardio = parseCardio(t)
  if (cardio) return { items: [cardio], unknown: [] }
  const ex = parseExercise(t, ctx, buildExerciseIndex(ctx.exercises))
  if (ex) return { items: [ex], unknown: [] }

  const { items, unknown } = parseFoods(t, ctx)
  return { items, unknown }
}
