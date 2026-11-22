import type { ActivityLevel, Goal, Profile, Targets } from './types'

export const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
}

export const ACTIVITY_LABELS: Record<ActivityLevel, { name: string; desc: string }> = {
  sedentary: { name: 'Sedentario', desc: 'Trabajo de oficina, poco movimiento' },
  light: { name: 'Ligero', desc: 'Ejercicio suave 1–3 días/semana' },
  moderate: { name: 'Moderado', desc: 'Ejercicio 3–5 días/semana' },
  active: { name: 'Activo', desc: 'Ejercicio intenso 6–7 días/semana' },
  very_active: { name: 'Muy activo', desc: 'Doble sesión o trabajo físico' },
}

export const GOAL_DELTA: Record<Goal, number> = {
  lose: -400,
  recomp: -150,
  maintain: 0,
  gain: 300,
}

export const GOAL_LABELS: Record<Goal, { name: string; desc: string }> = {
  lose: { name: 'Perder grasa / Definición', desc: 'Déficit de 400 kcal' },
  recomp: { name: 'Recomposición', desc: 'Déficit suave de 150 kcal' },
  maintain: { name: 'Mantenimiento', desc: 'Mismas kcal que gastas' },
  gain: { name: 'Ganar músculo', desc: 'Superávit de 300 kcal' },
}

/** g de proteína por kg de peso según objetivo */
const PROTEIN_PER_KG: Record<Goal, number> = { lose: 2.2, recomp: 2.0, maintain: 1.8, gain: 1.9 }
/** g de grasa por kg de peso según objetivo */
const FAT_PER_KG: Record<Goal, number> = { lose: 0.8, recomp: 0.9, maintain: 0.9, gain: 1.0 }

/** Mifflin-St Jeor */
export function bmr(p: Pick<Profile, 'sex' | 'age' | 'heightCm' | 'weightKg'>): number {
  const base = 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age
  return Math.round(p.sex === 'male' ? base + 5 : base - 161)
}

export function computeTargets(p: Profile): Targets {
  const b = bmr(p)
  const tdee = Math.round(b * ACTIVITY_FACTORS[p.activity])
  const floor = p.sex === 'male' ? 1500 : 1200
  const kcal = Math.max(floor, tdee + GOAL_DELTA[p.goal])

  const protein = Math.round(p.weightKg * PROTEIN_PER_KG[p.goal])
  const fat = Math.round(p.weightKg * FAT_PER_KG[p.goal])
  const carbsKcal = kcal - protein * 4 - fat * 9
  const carbs = Math.max(60, Math.round(carbsKcal / 4))

  return {
    bmr: b,
    tdee,
    kcal,
    protein,
    carbs,
    fat,
    waterMl: waterGoal(p.weightKg, false),
  }
}

/** 35 ml × kg (+500 ml los días con entreno o cardio), redondeado a 50 ml */
export function waterGoal(weightKg: number, trainingDay: boolean): number {
  const base = 35 * weightKg + (trainingDay ? 500 : 0)
  return Math.round(base / 50) * 50
}
