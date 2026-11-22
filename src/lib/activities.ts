import type { CardioKind, Intensity } from './types'

export interface CardioDef {
  id: CardioKind
  name: string
  met: number
  /** key into the lucide icon map used by the UI */
  icon: 'walk' | 'footprints' | 'run' | 'zap' | 'bike' | 'activity' | 'waves' | 'trophy'
}

export const CARDIO: CardioDef[] = [
  { id: 'walk_easy', name: 'Caminar tranquilo', met: 3.0, icon: 'walk' },
  { id: 'walk_fast', name: 'Caminar rápido', met: 4.3, icon: 'footprints' },
  { id: 'run_easy', name: 'Correr suave', met: 8.3, icon: 'run' },
  { id: 'run_hard', name: 'Correr intenso', met: 11.5, icon: 'zap' },
  { id: 'bike', name: 'Bicicleta', met: 7.0, icon: 'bike' },
  { id: 'elliptical', name: 'Elíptica', met: 5.0, icon: 'activity' },
  { id: 'swim', name: 'Natación', met: 6.0, icon: 'waves' },
  { id: 'sport', name: 'Fútbol / Deporte', met: 7.0, icon: 'trophy' },
]

export const cardioById = (id: CardioKind) => CARDIO.find((c) => c.id === id)!

/** kcal = MET × kg × horas */
export function metKcal(met: number, weightKg: number, minutes: number): number {
  return Math.round(met * weightKg * (minutes / 60))
}

export const cardioKcal = (kind: CardioKind, weightKg: number, minutes: number) =>
  metKcal(cardioById(kind).met, weightKg, minutes)

/** Zancada ≈ 41,5 % de la altura */
export function stepsToKm(steps: number, heightCm: number): number {
  return (steps * heightCm * 0.415) / 100000
}

/** Gasto neto de caminar ≈ 0,53 kcal por kg y km */
export function stepsKcal(steps: number, weightKg: number, heightCm: number): number {
  return Math.round(stepsToKm(steps, heightCm) * weightKg * 0.53)
}

export const GYM_MET: Record<Intensity, number> = { light: 3.5, moderate: 5.0, high: 6.0 }

export const INTENSITY_LABELS: Record<Intensity, string> = {
  light: 'Ligera',
  moderate: 'Media',
  high: 'Alta',
}

export function gymKcal(intensity: Intensity, weightKg: number, durationSec: number): number {
  return metKcal(GYM_MET[intensity], weightKg, durationSec / 60)
}
