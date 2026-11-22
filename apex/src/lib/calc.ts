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
export const cardioById = (id: CardioKind): CardioDef => CARDIO.find((c) => c.id === id) ?? CARDIO[0]
export const cardioKcal = (kind: CardioKind, weightKg: number, minutes: number): number => metKcal(cardioById(kind).met, weightKg, minutes)
