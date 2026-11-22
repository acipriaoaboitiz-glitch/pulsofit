import type { CardioKind, Intensity } from './types'

/** kcal = 0.0175 × MET × kg × minutos */
export function metKcal(met: number, weightKg: number, minutes: number): number {
  return Math.round(0.0175 * met * weightKg * minutes)
}

// ---------------------------------------------------------------- strength
/** MET de entrenamiento de fuerza (Compendium of Physical Activities). */
export const GYM_MET: Record<Intensity, number> = { light: 3.5, moderate: 5.0, high: 6.0 }
export const INTENSITY_LABELS: Record<Intensity, string> = { light: 'Ligera', moderate: 'Media', high: 'Alta' }

/** Densidad de trabajo (kg levantados por minuto de sesión) → intensidad sugerida. */
export function suggestIntensity(volumeKg: number, minutes: number): Intensity {
  const density = volumeKg / Math.max(1, minutes)
  if (density >= 130) return 'high'
  if (density >= 55) return 'moderate'
  return 'light'
}

export const gymKcal = (intensity: Intensity, weightKg: number, durationSec: number): number =>
  metKcal(GYM_MET[intensity], weightKg, durationSec / 60)

/** 1RM estimado (Epley): peso × (1 + reps/30) */
export const epley = (kg: number, reps: number): number => (kg > 0 && reps > 0 ? kg * (1 + reps / 30) : 0)
export const round05 = (n: number): number => Math.round(n * 2) / 2

// ---------------------------------------------------------------- plates
export const PLATES = [25, 20, 15, 10, 5, 2.5, 1.25] as const
export const PLATE_COLORS: Record<number, string> = {
  25: '#EF4444',
  20: '#3B82F6',
  15: '#EAB308',
  10: '#22C55E',
  5: '#F4F4F5',
  2.5: '#A1A1AA',
  1.25: '#71717A',
}

export interface PlateCalc {
  /** plates to load on EACH side, heaviest first */
  perSide: number[]
  /** kg that cannot be reached with the available plates (total, both sides) */
  remainder: number
  belowBar: boolean
}

export function platesFor(total: number, bar = 20): PlateCalc {
  if (total < bar) return { perSide: [], remainder: 0, belowBar: true }
  let side = Math.round(((total - bar) / 2) * 100) / 100
  const perSide: number[] = []
  for (const p of PLATES) {
    while (side + 1e-9 >= p) {
      perSide.push(p)
      side = Math.round((side - p) * 100) / 100
    }
  }
  return { perSide, remainder: Math.round(side * 2 * 100) / 100, belowBar: false }
}

// ---------------------------------------------------------------- steps & cardio
/** Zancada ≈ 41,5 % de la altura */
export const stepsToKm = (steps: number, heightCm: number): number => (steps * heightCm * 0.415) / 100000

/** Caminar ≈ 100 pasos/min a MET 3.0 → kcal = 0.0175 × 3.0 × kg × (pasos/100) */
export const WALK_MET = 3.0
export const stepsKcal = (steps: number, weightKg: number): number => metKcal(WALK_MET, weightKg, steps / 100)

export interface CardioDef {
  id: CardioKind
  name: string
  met: number
}

export const CARDIO: CardioDef[] = [
  { id: 'walk', name: 'Caminar', met: 3.5 },
  { id: 'run', name: 'Correr', met: 9.8 },
  { id: 'bike', name: 'Bici', met: 7.5 },
  { id: 'elliptical', name: 'Elíptica', met: 5.0 },
  { id: 'swim', name: 'Natación', met: 6.0 },
  { id: 'sport', name: 'Fútbol / Deporte', met: 7.0 },
]
/** Treadmill is logged with its own ACSM formula (not listed with the MET activities). */
const TREADMILL_DEF: CardioDef = { id: 'treadmill', name: 'Cinta inclinada', met: 8 }
export const cardioById = (id: CardioKind): CardioDef => [...CARDIO, TREADMILL_DEF].find((c) => c.id === id) ?? CARDIO[0]

// ---------------------------------------------------------------- inclined treadmill (ACSM walking equation)
export const TREADMILL_FALLBACK_KG = 90
export const TREADMILL_MINUTES = [20, 30, 40, 45]
export const TREADMILL_PRESETS = [
  { id: 'habitual', name: 'Mi Cinta Habitual', speed: 4.5, incline: 15 },
  { id: 'suave', name: 'Cinta Suave', speed: 4.0, incline: 15 },
] as const

/**
 * VO2 = 3.5 + 0.1·v + 1.8·v·pendiente (v en m/min) → kcal = VO2 · kg / 200 · minutos.
 * Ej.: 4.5 km/h al 15 % con 90 kg ≈ 422 kcal en 30 min.
 */
export function treadmillKcal(speedKmh: number, inclinePct: number, weightKg: number, minutes: number): number {
  const v = (speedKmh * 1000) / 60
  const vo2 = 3.5 + 0.1 * v + 1.8 * v * (inclinePct / 100)
  return Math.round(((vo2 * weightKg) / 200) * minutes)
}
export const cardioKcal = (kind: CardioKind, weightKg: number, minutes: number): number => metKcal(cardioById(kind).met, weightKg, minutes)

// ---------------------------------------------------------------- kcal per exercise (sum of its completed sets)
export const DEFAULT_WEIGHT_KG = 89

/** seconds under tension per rep and rest share counted as active time for every set */
const SEC_PER_REP = 3
const REST_SHARE_SEC = 45

/**
 * Approximate kcal of ONE completed set:
 *  - MET part: 0,0175 × MET × kg corporal × minutos (reps × 3 s + 45 s de descanso)
 *  - Work part: volumen (kg × reps) × 9,81 m/s² × 0,45 m de recorrido ÷ 4184 ÷ 25 % de rendimiento
 */
export function setKcal(met: number, bodyKg: number, kg: number, reps: number): number {
  const minutes = (reps * SEC_PER_REP + REST_SHARE_SEC) / 60
  const metPart = 0.0175 * met * bodyKg * minutes
  const workPart = (kg * reps * 9.81 * 0.45) / 4184 / 0.25
  return metPart + workPart
}

/** Total kcal of the completed sets of one exercise (rounded). */
export function exerciseSetsKcal(met: number, bodyKg: number, sets: { kg: number; reps: number; done: boolean }[]): number {
  return Math.round(sets.filter((s) => s.done).reduce((a, s) => a + setKcal(met, bodyKg, s.kg, s.reps), 0))
}
