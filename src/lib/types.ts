export type Sex = 'male' | 'female'
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'
export type Goal = 'lose' | 'recomp' | 'maintain' | 'gain'
export type Meal = 'desayuno' | 'comida' | 'cena' | 'snack'

/** Every synced record carries a client UUID and an update timestamp (ms). */
export interface Rec {
  id: string
  u: number
}

export interface Profile {
  sex: Sex
  age: number
  heightCm: number
  weightKg: number
  targetKg: number
  activity: ActivityLevel
  goal: Goal
  u: number
}

export interface Targets {
  bmr: number
  tdee: number
  kcal: number
  protein: number
  carbs: number
  fat: number
  waterMl: number
}

export interface FoodLog extends Rec {
  date: string
  meal: Meal
  name: string
  brand?: string
  grams: number
  kcal: number
  protein: number
  carbs: number
  fat: number
  source: 'barcode' | 'ai' | 'search' | 'custom'
  image?: string
}

export interface WaterLog extends Rec {
  date: string
  ml: number
}

export type CardioKind =
  | 'walk_easy'
  | 'walk_fast'
  | 'run_easy'
  | 'run_hard'
  | 'bike'
  | 'elliptical'
  | 'swim'
  | 'sport'

export interface ActivityLog extends Rec {
  date: string
  type: 'steps' | 'cardio'
  steps?: number
  cardio?: CardioKind
  minutes?: number
  kcal: number
}

export interface WeightLog extends Rec {
  date: string
  kg: number
}

export interface SavedFood extends Rec {
  name: string
  brand?: string
  kcal100: number
  protein100: number
  carbs100: number
  fat100: number
  servingG: number
}

export interface RoutineExercise {
  exerciseId: string
  sets: number
  reps: number
  restSec: number
}

export interface Routine extends Rec {
  name: string
  program: string
  exercises: RoutineExercise[]
}

export interface SetLog {
  kg: number
  reps: number
  done: boolean
  pr?: 'peso' | 'volumen'
}

export interface SessionExercise {
  exerciseId: string
  sets: SetLog[]
  restSec?: number
}

export type Intensity = 'light' | 'moderate' | 'high'

export interface WorkoutSession extends Rec {
  date: string
  routineName: string
  startedAt: number
  durationSec: number
  intensity: Intensity
  kcal: number
  volume: number
  prCount: number
  exercises: SessionExercise[]
}

export interface ActiveWorkout {
  routineName: string
  startedAt: number
  exercises: SessionExercise[]
  restTotal: number
  restEndsAt: number | null
}

export interface WorkoutSummary {
  routineName: string
  durationSec: number
  kcal: number
  volume: number
  sets: number
  prs: { exercise: string; kind: 'peso' | 'volumen' }[]
}

export interface AiUsage {
  day: string
  count: number
}

export interface AppState {
  v: 1
  profile: Profile | null
  food: FoodLog[]
  water: WaterLog[]
  activity: ActivityLog[]
  weights: WeightLog[]
  saved: SavedFood[]
  routines: Routine[]
  sessions: WorkoutSession[]
  ai: AiUsage
  active: ActiveWorkout | null
  /** ms timestamp of the last successful cloud push/pull reconciliation */
  lastSync: number
  /** local deletions still to be propagated to the cloud */
  tomb: Tomb[]
}

export type Collection = 'food' | 'water' | 'activity' | 'weights' | 'saved' | 'routines' | 'sessions'
export interface Tomb {
  c: Collection
  id: string
}

export interface Macros {
  kcal: number
  protein: number
  carbs: number
  fat: number
}

export interface Per100 {
  kcal: number
  protein: number
  carbs: number
  fat: number
}

export interface FoodProduct {
  id: string
  name: string
  brand?: string
  image?: string
  nutriScore?: string
  per100: Per100
  servingG?: number
  servingLabel?: string
  source: FoodLog['source']
}
