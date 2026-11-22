import type { ActiveWorkout, Muscle, Routine, SessionExercise, SetLog, WorkoutSession } from './types'
import { epley } from './calc'
import { exerciseById } from './exercises'

/** Sets of the most recent finished session that included this exercise (done sets only). */
export function lastSetsFor(sessions: WorkoutSession[], exerciseId: string): SetLog[] | null {
  const sorted = [...sessions].sort((a, b) => b.startedAt - a.startedAt)
  for (const s of sorted) {
    const ex = s.exercises.find((e) => e.exerciseId === exerciseId)
    const done = ex?.sets.filter((x) => x.done)
    if (done && done.length) return done
  }
  return null
}

/** Ghost sets: peso y repeticiones de la última vez, serie a serie. */
export function ghostSets(sessions: WorkoutSession[], exerciseId: string, count: number, defReps: number): SetLog[] {
  const last = lastSetsFor(sessions, exerciseId)
  return Array.from({ length: count }, (_, i) => {
    const ref = last ? (last[i] ?? last[last.length - 1]) : null
    return { kg: ref?.kg ?? 0, reps: ref?.reps ?? defReps, done: false }
  })
}

export function newExercise(sessions: WorkoutSession[], exerciseId: string, sets = 3, reps = 10, restSec = 90): SessionExercise {
  return { exerciseId, sets: ghostSets(sessions, exerciseId, sets, reps), restSec }
}

export function buildActive(routine: Routine | null, sessions: WorkoutSession[]): ActiveWorkout {
  const exercises = (routine?.exercises ?? []).map((re) => newExercise(sessions, re.exerciseId, re.sets, re.reps, re.restSec))
  return {
    routineName: routine?.name ?? 'Sesión libre',
    startedAt: Date.now(),
    exercises,
    restTotal: routine?.exercises[0]?.restSec ?? 90,
    restEndsAt: null,
  }
}

/** Best historical estimated 1RM for an exercise (null = never done). */
export function bestE1rm(sessions: WorkoutSession[], exerciseId: string): number | null {
  let best = 0
  let has = false
  for (const s of sessions)
    for (const e of s.exercises)
      if (e.exerciseId === exerciseId)
        for (const set of e.sets)
          if (set.done) {
            has = true
            best = Math.max(best, epley(set.kg, set.reps))
          }
  return has ? best : null
}

/**
 * PR = new estimated 1RM (Epley) above everything done before. Needs history for the
 * exercise (the first time is never flagged). `earlier` = already-done sets of the current session.
 */
export function isPr(base: number | null, earlier: SetLog[], set: SetLog): boolean {
  if (base === null) return false
  const e = epley(set.kg, set.reps)
  if (e <= 0) return false
  const sessionBest = Math.max(0, ...earlier.filter((s) => s.done).map((s) => epley(s.kg, s.reps)))
  return e > Math.max(base, sessionBest) + 1e-9
}

export const sessionVolume = (exs: SessionExercise[]): number =>
  Math.round(exs.reduce((a, e) => a + e.sets.filter((s) => s.done).reduce((b, s) => b + s.kg * s.reps, 0), 0))

/** Exercises the user repeats most (last 90 days) – "Lo de siempre". */
export function frequentExercises(sessions: WorkoutSession[], n = 8): string[] {
  const since = Date.now() - 90 * 86400000
  const count = new Map<string, number>()
  for (const s of sessions) {
    if (s.startedAt < since) continue
    for (const e of s.exercises) count.set(e.exerciseId, (count.get(e.exerciseId) ?? 0) + 1)
  }
  return [...count.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([id]) => id)
}

export interface MuscleLoad {
  lastAt: number
  sets: number
}

/** Last time and volume (sets) per muscle; secondary muscles count half. Includes the running workout. */
export function muscleLoad(sessions: WorkoutSession[], active: ActiveWorkout | null): Record<Muscle, MuscleLoad> {
  const out = {} as Record<Muscle, MuscleLoad>
  const add = (m: Muscle, at: number, sets: number): void => {
    const cur = out[m] ?? { lastAt: 0, sets: 0 }
    out[m] = { lastAt: Math.max(cur.lastAt, at), sets: cur.sets + sets }
  }
  const apply = (exs: SessionExercise[], at: number): void => {
    for (const e of exs) {
      const def = exerciseById(e.exerciseId)
      const done = e.sets.filter((s) => s.done).length
      if (!def || done === 0) continue
      add(def.muscle, at, done)
      for (const m of def.sec ?? []) add(m, at, done / 2)
    }
  }
  for (const s of sessions) apply(s.exercises, s.startedAt + s.durationSec * 1000)
  if (active) apply(active.exercises, Date.now())
  return out
}

// ------------------------------------------------------------------ per-exercise history (Gym screen)
export interface ExerciseEntry {
  session: WorkoutSession
  /** completed sets of this exercise in that session */
  sets: SetLog[]
  /** share of the session's kcal attributable to this exercise (by completed sets) */
  kcal: number
}

/** kcal of a session split across its exercises proportionally to completed sets. */
export function exerciseKcalShare(session: WorkoutSession, exerciseId: string): number {
  const total = session.exercises.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0)
  if (total === 0) return 0
  const mine = session.exercises.filter((e) => e.exerciseId === exerciseId).reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0)
  return Math.round((session.kcal * mine) / total)
}

/** Every time the exercise was done, newest first. */
export function exerciseHistory(sessions: WorkoutSession[], exerciseId: string): ExerciseEntry[] {
  const out: ExerciseEntry[] = []
  for (const s of [...sessions].sort((a, b) => b.startedAt - a.startedAt)) {
    const sets = s.exercises.filter((e) => e.exerciseId === exerciseId).flatMap((e) => e.sets.filter((x) => x.done))
    if (sets.length) out.push({ session: s, sets, kcal: exerciseKcalShare(s, exerciseId) })
  }
  return out
}
