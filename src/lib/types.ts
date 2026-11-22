export type Sex = 'male' | 'female'
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'
export type Goal = 'lose' | 'recomp' | 'maintain' | 'gain'
export type Meal = 'desayuno' | 'comida' | 'cena' | 'snack'

/** Every synced record carries a client id and an update timestamp (ms). */
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
  source: 'barcode' | 'ai' | 'search' | 'custom' | 'text'
  image?: string
}

export interface WaterLog extends Rec {
  date: string
  ml: number
}

/** One row per day. `health` = read from Health Connect / HealthKit, `manual` = typed or quick buttons. */
export interface DailySteps extends Rec {
  date: string
  steps: number
  source: 'manual' | 'health'
}

export type CardioKind = 'walk' | 'run' | 'bike' | 'elliptical' | 'swim' | 'sport' | 'treadmill'

export interface CardioLog extends Rec {
  date: string
  cardio: CardioKind
  minutes: number
  kcal: number
  /** treadmill only: incline % and speed km/h (remembered for the next session) */
  inclinePct?: number
  speedKmh?: number
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

export type Muscle =
  | 'Pecho'
  | 'Espalda'
  | 'Hombros'
  | 'Bíceps'
  | 'Tríceps'
  | 'Cuádriceps'
  | 'Isquios'
  | 'Glúteos'
  | 'Gemelos'
  | 'Core'

export interface CustomExercise extends Rec {
  name: string
  muscle: Muscle
  equipment: string
}

export interface RoutineExercise {
  exerciseId: string
  sets: number
  reps: number
  restSec: number
  /** extra, optional work (shown with a BONUS badge) */
  bonus?: boolean
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
  /** new estimated 1RM record when the set was completed */
  pr?: boolean
}

export interface SessionExercise {
  exerciseId: string
  sets: SetLog[]
  restSec?: number
  bonus?: boolean
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
  prs: { exercise: string; e1rm: number }[]
}

/** Daily AI usage: photo scans are capped at 3/day, text parsing has its own generous cap. */
export interface AiUsage {
  day: string
  photo: number
  text: number
}

export type Collection = 'food' | 'water' | 'steps' | 'cardio' | 'weights' | 'saved' | 'routines' | 'sessions' | 'custom'

export interface Tomb {
  c: Collection
  id: string
}

export interface AppState {
  v: 1
  profile: Profile | null
  food: FoodLog[]
  water: WaterLog[]
  steps: DailySteps[]
  cardio: CardioLog[]
  weights: WeightLog[]
  saved: SavedFood[]
  custom: CustomExercise[]
  routines: Routine[]
  sessions: WorkoutSession[]
  ai: AiUsage
  active: ActiveWorkout | null
  /** ms timestamp of the last successful cloud reconciliation */
  lastSync: number
  /** local deletions still to be propagated to the cloud */
  tomb: Tomb[]
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

export type StoreId = 'mercadona' | 'lidl' | 'aldi' | 'eroski'

export interface FoodProduct {
  id: string
  name: string
  brand?: string
  image?: string
  nutriScore?: string
  per100: Per100
  servingG?: number
  servingLabel?: string
  /** Spanish chain that sells it (detected from Open Food Facts) */
  store?: StoreId
  source: FoodLog['source']
}
