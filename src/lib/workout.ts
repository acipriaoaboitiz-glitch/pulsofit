import type { ActiveWorkout, Routine, SessionExercise, SetLog, WorkoutSession } from './types'

/** Sets of the most recent finished session that included this exercise. */
export function lastSetsFor(sessions: WorkoutSession[], exerciseId: string): SetLog[] | null {
  const sorted = [...sessions].sort((a, b) => b.startedAt - a.startedAt)
  for (const s of sorted) {
    const ex = s.exercises.find((e) => e.exerciseId === exerciseId)
    const done = ex?.sets.filter((x) => x.done)
    if (done && done.length) return done
  }
  return null
}

export function buildActive(routine: Routine | null, sessions: WorkoutSession[]): ActiveWorkout {
  const exercises: SessionExercise[] = (routine?.exercises ?? []).map((re) => {
    const last = lastSetsFor(sessions, re.exerciseId)
    const sets: SetLog[] = Array.from({ length: re.sets }, (_, i) => {
      const ref = last ? (last[i] ?? last[last.length - 1]) : null
      return { kg: ref?.kg ?? 0, reps: ref?.reps ?? re.reps, done: false }
    })
    return { exerciseId: re.exerciseId, sets, restSec: re.restSec }
  })
  return {
    routineName: routine?.name ?? 'Entreno libre',
    startedAt: Date.now(),
    exercises,
    restTotal: routine?.exercises[0]?.restSec ?? 90,
    restEndsAt: null,
  }
}

export interface PrBaseline {
  hasHistory: boolean
  maxKg: number
  maxSetVolume: number
}

/** Best historical weight and best single-set volume for an exercise. */
export function baselineFor(sessions: WorkoutSession[], exerciseId: string): PrBaseline {
  let maxKg = 0
  let maxSetVolume = 0
  let hasHistory = false
  for (const s of sessions) {
    for (const e of s.exercises) {
      if (e.exerciseId !== exerciseId) continue
      for (const set of e.sets) {
        if (!set.done) continue
        hasHistory = true
        maxKg = Math.max(maxKg, set.kg)
        maxSetVolume = Math.max(maxSetVolume, set.kg * set.reps)
      }
    }
  }
  return { hasHistory, maxKg, maxSetVolume }
}

/**
 * PR for a just-completed set. Needs previous history for the exercise
 * (first time doing it is never flagged). `earlier` are the already-done sets
 * of the same exercise in the current session.
 */
export function detectPr(base: PrBaseline, earlier: SetLog[], set: SetLog): SetLog['pr'] {
  if (!base.hasHistory || set.kg <= 0 || set.reps <= 0) return undefined
  const sessionMaxKg = Math.max(0, ...earlier.filter((s) => s.done).map((s) => s.kg))
  const sessionMaxVol = Math.max(0, ...earlier.filter((s) => s.done).map((s) => s.kg * s.reps))
  if (set.kg > Math.max(base.maxKg, sessionMaxKg)) return 'peso'
  if (set.kg * set.reps > Math.max(base.maxSetVolume, sessionMaxVol)) return 'volumen'
  return undefined
}

export const sessionVolume = (exs: SessionExercise[]) =>
  Math.round(exs.reduce((a, e) => a + e.sets.filter((s) => s.done).reduce((b, s) => b + s.kg * s.reps, 0), 0))
