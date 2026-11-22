import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from 'react'
import type { ReactNode } from 'react'
import type {
  ActiveWorkout,
  AppState,
  CardioLog,
  Collection,
  CustomExercise,
  DailySteps,
  FoodLog,
  Muscle,
  Profile,
  Routine,
  SavedFood,
  Targets,
  Tomb,
  WaterLog,
  WeightLog,
  WorkoutSession,
} from './types'
import { computeTargets, waterGoal } from './metabolic'
import { registerCustomExercises } from './exercises'
import { addDays, todayKey, uid } from './utils'
import { stepsKcal, stepsToKm } from './calc'

const KEY = 'apex.state.v1'
export const AI_PHOTO_LIMIT = 3
export const AI_TEXT_LIMIT = 20

const COLLECTIONS: Collection[] = ['food', 'water', 'steps', 'cardio', 'weights', 'saved', 'routines', 'sessions', 'custom']

const initial = (): AppState => ({
  v: 1,
  profile: null,
  food: [],
  water: [],
  steps: [],
  cardio: [],
  weights: [],
  saved: [],
  custom: [],
  routines: [],
  sessions: [],
  ai: { day: todayKey(), photo: 0, text: 0 },
  active: null,
  lastSync: 0,
  tomb: [],
})

function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return initial()
    const parsed = JSON.parse(raw) as AppState
    if (parsed.v !== 1) return initial()
    const merged = { ...initial(), ...parsed }
    // Older builds shipped predefined routines (Push/Pull/Legs…). There are none anymore: drop them, keep the user's own.
    const seeded = merged.routines.filter((x) => x.id.startsWith('tpl-'))
    if (seeded.length) {
      merged.routines = merged.routines.filter((x) => !x.id.startsWith('tpl-'))
      merged.tomb = [...merged.tomb, ...seeded.map((x) => ({ c: 'routines' as const, id: x.id }))]
    }
    return merged
  } catch {
    return initial()
  }
}

type Action =
  | { t: 'replace'; state: AppState }
  | { t: 'profile'; profile: Profile }
  | { t: 'add'; c: Collection; rec: { id: string; u: number } }
  | { t: 'update'; c: Collection; id: string; patch: Record<string, unknown> }
  | { t: 'remove'; c: Collection; id: string }
  | { t: 'set'; c: Collection; recs: { id: string; u: number }[] }
  | { t: 'active'; active: ActiveWorkout | null }
  | { t: 'ai'; ai: AppState['ai'] }
  | { t: 'merge'; patch: Partial<AppState>; at: number; sentTomb: Tomb[] }

type Row = { id: string; u: number }

function reducer(s: AppState, a: Action): AppState {
  switch (a.t) {
    case 'replace':
      return a.state
    case 'profile':
      return { ...s, profile: a.profile }
    case 'add':
      return { ...s, [a.c]: [...(s[a.c] as Row[]), a.rec] }
    case 'update':
      return { ...s, [a.c]: (s[a.c] as Row[]).map((r) => (r.id === a.id ? { ...r, ...a.patch, u: Date.now() } : r)) }
    case 'remove':
      return { ...s, [a.c]: (s[a.c] as Row[]).filter((r) => r.id !== a.id), tomb: [...s.tomb, { c: a.c, id: a.id }] }
    case 'set': {
      const keep = new Set(a.recs.map((r) => r.id))
      const gone = (s[a.c] as Row[]).filter((r) => !keep.has(r.id)).map((r) => ({ c: a.c, id: r.id }))
      return { ...s, [a.c]: a.recs, tomb: [...s.tomb, ...gone] }
    }
    case 'active':
      return { ...s, active: a.active }
    case 'ai':
      return { ...s, ai: a.ai }
    case 'merge': {
      // Edits made while the (async) sync was running must survive it:
      // newer local records win, later deletions stay deleted, and their tombstones are kept.
      const key = (t: Tomb) => `${t.c}:${t.id}`
      const sent = new Set(a.sentTomb.map(key))
      const newTomb = s.tomb.filter((t) => !sent.has(key(t)))
      const next: AppState = { ...s, lastSync: a.at, tomb: newTomb }
      for (const c of COLLECTIONS) {
        const merged = a.patch[c] as Row[] | undefined
        if (!merged) continue
        const byId = new Map(merged.map((r) => [r.id, r]))
        for (const l of s[c] as Row[]) if (l.u > a.at) byId.set(l.id, l)
        for (const t of newTomb) if (t.c === c) byId.delete(t.id)
        ;(next as unknown as Record<string, unknown>)[c] = [...byId.values()]
      }
      if (a.patch.profile && !(s.profile && s.profile.u > a.at)) next.profile = a.patch.profile
      return next
    }
  }
}

export interface DayTotals {
  consumed: number
  protein: number
  carbs: number
  fat: number
  waterMl: number
  steps: number
  stepsKcal: number
  cardioKcal: number
  gymKcal: number
  gymVolume: number
  /** calorías activas = pasos + cardio + pesas */
  burned: number
  km: number
  trained: boolean
}

interface Store {
  state: AppState
  targets: Targets | null
  dispatch: (a: Action) => void
  saveProfile: (p: Omit<Profile, 'u'>) => void
  addFood: (f: Omit<FoodLog, 'id' | 'u'>) => void
  updateFood: (id: string, patch: Partial<FoodLog>) => void
  removeFood: (id: string) => void
  addWater: (ml: number, date?: string) => void
  addSteps: (steps: number, date?: string) => void
  setStepsTotal: (steps: number, source: DailySteps['source'], date?: string) => void
  addCardio: (rec: Omit<CardioLog, 'id' | 'u'>) => void
  removeCardio: (id: string) => void
  addWeight: (kg: number, date?: string) => void
  removeWeight: (id: string) => void
  saveFood: (f: Omit<SavedFood, 'id' | 'u'>) => SavedFood
  removeSaved: (id: string) => void
  addCustomExercise: (name: string, muscle: Muscle, equipment?: string) => CustomExercise
  removeCustomExercise: (id: string) => void
  saveRoutine: (r: Omit<Routine, 'u'>) => void
  removeRoutine: (id: string) => void
  addSession: (s: Omit<WorkoutSession, 'id' | 'u'>) => void
  removeSession: (id: string) => void
  setActive: (a: ActiveWorkout | null) => void
  /** photo scans left today (cap 3) */
  aiRemaining: number
  aiTextRemaining: number
  bumpAi: (kind: 'photo' | 'text', count?: number) => void
  totals: (date: string) => DayTotals
  waterTarget: (date: string) => number
  streak: number
  resetAll: () => void
}

const Ctx = createContext<Store | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, load)

  // Debounced persistence (offline-first: everything is written locally right away)
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => {
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      try {
        localStorage.setItem(KEY, JSON.stringify(state))
      } catch {
        /* quota / private mode */
      }
    }, 250)
  }, [state])

  registerCustomExercises(state.custom)

  const targets = useMemo(() => (state.profile ? computeTargets(state.profile) : null), [state.profile])

  const totals = useCallback(
    (date: string): DayTotals => {
      const p = state.profile
      let consumed = 0
      let protein = 0
      let carbs = 0
      let fat = 0
      for (const f of state.food) {
        if (f.date !== date) continue
        consumed += f.kcal
        protein += f.protein
        carbs += f.carbs
        fat += f.fat
      }
      const waterMl = state.water.filter((w) => w.date === date).reduce((a, w) => a + w.ml, 0)
      const steps = state.steps.filter((x) => x.date === date).reduce((a, x) => a + x.steps, 0)
      const cardios = state.cardio.filter((c) => c.date === date)
      const cardioKcal = cardios.reduce((a, c) => a + c.kcal, 0)
      const sessions = state.sessions.filter((x) => x.date === date)
      const gymKcal = sessions.reduce((a, x) => a + x.kcal, 0)
      const gymVolume = sessions.reduce((a, x) => a + x.volume, 0)
      const sk = p ? stepsKcal(steps, p.weightKg) : 0
      return {
        consumed: Math.round(consumed),
        protein: Math.round(protein),
        carbs: Math.round(carbs),
        fat: Math.round(fat),
        waterMl,
        steps,
        stepsKcal: sk,
        cardioKcal,
        gymKcal,
        gymVolume,
        burned: sk + cardioKcal + gymKcal,
        km: p ? stepsToKm(steps, p.heightCm) : 0,
        trained: cardios.length > 0 || sessions.length > 0,
      }
    },
    [state.food, state.water, state.steps, state.cardio, state.sessions, state.profile],
  )

  const waterTarget = useCallback(
    (date: string) => (state.profile ? waterGoal(state.profile.weightKg, totals(date).trained) : 2500),
    [state.profile, totals],
  )

  const streak = useMemo(() => {
    const days = new Set<string>()
    for (const f of state.food) days.add(f.date)
    for (const w of state.water) days.add(w.date)
    for (const x of state.steps) if (x.steps > 0) days.add(x.date)
    for (const c of state.cardio) days.add(c.date)
    for (const s of state.sessions) days.add(s.date)
    let d = todayKey()
    if (!days.has(d)) d = addDays(d, -1)
    let n = 0
    while (days.has(d)) {
      n++
      d = addDays(d, -1)
    }
    return n
  }, [state.food, state.water, state.steps, state.cardio, state.sessions])

  const aiToday = state.ai.day === todayKey() ? state.ai : { day: todayKey(), photo: 0, text: 0 }

  const store = useMemo<Store>(() => {
    const add = <T extends { id: string; u: number }>(c: Collection, data: Omit<T, 'id' | 'u'>, id = uid()) => {
      const rec = { ...data, id, u: Date.now() } as unknown as T
      dispatch({ t: 'add', c, rec })
      return rec
    }
    return {
      state,
      targets,
      dispatch,
      saveProfile: (p) => dispatch({ t: 'profile', profile: { ...p, u: Date.now() } }),
      addFood: (f) => void add<FoodLog>('food', f),
      updateFood: (id, patch) => dispatch({ t: 'update', c: 'food', id, patch }),
      removeFood: (id) => dispatch({ t: 'remove', c: 'food', id }),
      addWater: (ml, date = todayKey()) => {
        if (ml < 0) {
          const total = state.water.filter((w) => w.date === date).reduce((a, w) => a + w.ml, 0)
          if (total <= 0) return
          void add<WaterLog>('water', { date, ml: -Math.min(total, -ml) })
        } else void add<WaterLog>('water', { date, ml })
      },
      addSteps: (steps, date = todayKey()) => {
        const cur = state.steps.find((x) => x.date === date)
        if (cur) dispatch({ t: 'update', c: 'steps', id: cur.id, patch: { steps: cur.steps + steps, source: 'manual' } })
        else void add<DailySteps>('steps', { date, steps, source: 'manual' })
      },
      setStepsTotal: (steps, source, date = todayKey()) => {
        const cur = state.steps.find((x) => x.date === date)
        if (cur) {
          if (cur.steps !== steps || cur.source !== source) dispatch({ t: 'update', c: 'steps', id: cur.id, patch: { steps, source } })
        } else void add<DailySteps>('steps', { date, steps, source })
      },
      addCardio: (rec) => void add<CardioLog>('cardio', rec),
      removeCardio: (id) => dispatch({ t: 'remove', c: 'cardio', id }),
      addWeight: (kg, date = todayKey()) => {
        const others = state.weights.filter((w) => w.date !== date)
        const rec: WeightLog = { id: uid(), u: Date.now(), date, kg }
        dispatch({ t: 'set', c: 'weights', recs: [...others, rec] })
        if (state.profile) {
          const latest = [...others, rec].sort((a, b) => a.date.localeCompare(b.date)).at(-1)
          if (latest && latest.id === rec.id) dispatch({ t: 'profile', profile: { ...state.profile, weightKg: kg, u: Date.now() } })
        }
      },
      removeWeight: (id) => dispatch({ t: 'remove', c: 'weights', id }),
      saveFood: (f) => add<SavedFood>('saved', f),
      removeSaved: (id) => dispatch({ t: 'remove', c: 'saved', id }),
      addCustomExercise: (name, muscle, equipment = 'Personalizado') => add<CustomExercise>('custom', { name: name.trim(), muscle, equipment }),
      removeCustomExercise: (id) => dispatch({ t: 'remove', c: 'custom', id }),
      saveRoutine: (r) => {
        if (state.routines.some((x) => x.id === r.id)) dispatch({ t: 'update', c: 'routines', id: r.id, patch: r })
        else dispatch({ t: 'add', c: 'routines', rec: { ...r, u: Date.now() } })
      },
      removeRoutine: (id) => dispatch({ t: 'remove', c: 'routines', id }),
      addSession: (s) => void add<WorkoutSession>('sessions', s),
      removeSession: (id) => dispatch({ t: 'remove', c: 'sessions', id }),
      setActive: (a) => dispatch({ t: 'active', active: a }),
      aiRemaining: Math.max(0, AI_PHOTO_LIMIT - aiToday.photo),
      aiTextRemaining: Math.max(0, AI_TEXT_LIMIT - aiToday.text),
      bumpAi: (kind, count) => dispatch({ t: 'ai', ai: { ...aiToday, [kind]: count ?? aiToday[kind] + 1 } }),
      totals,
      waterTarget,
      streak,
      resetAll: () => {
        try {
          localStorage.removeItem(KEY)
        } catch {
          /* ignore */
        }
        dispatch({ t: 'replace', state: initial() })
      },
    }
  }, [state, targets, aiToday, totals, waterTarget, streak])

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>
}

export function useStore(): Store {
  const s = useContext(Ctx)
  if (!s) throw new Error('useStore outside StoreProvider')
  return s
}
