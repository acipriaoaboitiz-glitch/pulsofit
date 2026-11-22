import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  AppState,
  CardioLog,
  Collection,
  CustomExercise,
  DailySteps,
  FoodLog,
  Profile,
  Routine,
  SavedFood,
  SessionExercise,
  Tomb,
  WaterLog,
  WeightLog,
  WorkoutSession,
} from './types'

type Row = Record<string, unknown>
type Rec = { id: string; u: number }

interface Spec {
  c: Collection
  table: string
  toRow: (r: never) => Row
  fromRow: (row: Row) => Rec
}

const spec = <T extends Rec>(c: Collection, table: string, toRow: (r: T) => Row, fromRow: (row: Row) => T): Spec => ({
  c,
  table,
  toRow: toRow as unknown as (r: never) => Row,
  fromRow,
})

const str = (v: unknown) => (v == null ? undefined : String(v))
const num = (v: unknown) => Number(v ?? 0)
const ms = (v: unknown) => Date.parse(String(v)) || 0

/** Collections that map 1:1 to a table. Sessions are handled separately (sessions + workout_sets). */
const SPECS: Spec[] = [
  spec<FoodLog>(
    'food',
    'food_logs',
    (r) => ({ id: r.id, date: r.date, meal: r.meal, name: r.name, brand: r.brand ?? null, grams: r.grams, kcal: r.kcal, protein: r.protein, carbs: r.carbs, fat: r.fat, source: r.source, image: r.image ?? null }),
    (x) => ({
      id: String(x.id), u: ms(x.updated_at), date: String(x.date), meal: x.meal as FoodLog['meal'], name: String(x.name), brand: str(x.brand),
      grams: num(x.grams), kcal: num(x.kcal), protein: num(x.protein), carbs: num(x.carbs), fat: num(x.fat), source: x.source as FoodLog['source'], image: str(x.image),
    }),
  ),
  spec<WaterLog>('water', 'water_logs', (r) => ({ id: r.id, date: r.date, ml: r.ml }), (x) => ({ id: String(x.id), u: ms(x.updated_at), date: String(x.date), ml: num(x.ml) })),
  spec<DailySteps>(
    'steps',
    'daily_steps',
    (r) => ({ id: r.id, date: r.date, steps: r.steps, source: r.source }),
    (x) => ({ id: String(x.id), u: ms(x.updated_at), date: String(x.date), steps: num(x.steps), source: x.source as DailySteps['source'] }),
  ),
  spec<CardioLog>(
    'cardio',
    'cardio_logs',
    (r) => ({ id: r.id, date: r.date, cardio: r.cardio, minutes: r.minutes, kcal: r.kcal }),
    (x) => ({ id: String(x.id), u: ms(x.updated_at), date: String(x.date), cardio: x.cardio as CardioLog['cardio'], minutes: num(x.minutes), kcal: num(x.kcal) }),
  ),
  spec<WeightLog>('weights', 'weight_logs', (r) => ({ id: r.id, date: r.date, kg: r.kg }), (x) => ({ id: String(x.id), u: ms(x.updated_at), date: String(x.date), kg: num(x.kg) })),
  spec<SavedFood>(
    'saved',
    'saved_foods',
    (r) => ({ id: r.id, name: r.name, brand: r.brand ?? null, kcal100: r.kcal100, protein100: r.protein100, carbs100: r.carbs100, fat100: r.fat100, serving_g: r.servingG }),
    (x) => ({ id: String(x.id), u: ms(x.updated_at), name: String(x.name), brand: str(x.brand), kcal100: num(x.kcal100), protein100: num(x.protein100), carbs100: num(x.carbs100), fat100: num(x.fat100), servingG: num(x.serving_g) }),
  ),
  spec<CustomExercise>(
    'custom',
    'custom_exercises',
    (r) => ({ id: r.id, name: r.name, muscle: r.muscle, equipment: r.equipment }),
    (x) => ({ id: String(x.id), u: ms(x.updated_at), name: String(x.name), muscle: x.muscle as CustomExercise['muscle'], equipment: String(x.equipment ?? 'Personalizado') }),
  ),
  spec<Routine>(
    'routines',
    'workout_routines',
    (r) => ({ id: r.id, name: r.name, program: r.program, exercises: r.exercises }),
    (x) => ({ id: String(x.id), u: ms(x.updated_at), name: String(x.name), program: String(x.program ?? ''), exercises: (x.exercises as Routine['exercises']) ?? [] }),
  ),
]

const PAGE = 1000

async function fetchAll(sb: SupabaseClient, table: string): Promise<Row[]> {
  const out: Row[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await sb.from(table).select('*').order('id', { ascending: true }).range(from, from + PAGE - 1)
    if (error) throw error
    out.push(...((data as Row[]) ?? []))
    if (!data || data.length < PAGE) break
  }
  return out
}

export function isDirty(s: AppState): boolean {
  if (s.tomb.length > 0) return true
  if (s.profile && s.profile.u > s.lastSync) return true
  const all: Collection[] = [...SPECS.map((x) => x.c), 'sessions']
  return all.some((c) => (s[c] as Rec[]).some((r) => r.u > s.lastSync))
}

function profileToRow(p: Profile, userId: string, t: { kcal: number; protein: number; carbs: number; fat: number; waterMl: number }): Row {
  return {
    user_id: userId, sex: p.sex, age: p.age, height_cm: p.heightCm, weight_kg: p.weightKg, target_weight_kg: p.targetKg,
    activity_level: p.activity, goal: p.goal, kcal_target: t.kcal, protein_target: t.protein, carbs_target: t.carbs, fat_target: t.fat,
    water_target_ml: t.waterMl, updated_at: new Date(p.u).toISOString(),
  }
}

function rowToProfile(x: Row): Profile {
  return {
    sex: x.sex as Profile['sex'], age: num(x.age), heightCm: num(x.height_cm), weightKg: num(x.weight_kg), targetKg: num(x.target_weight_kg),
    activity: x.activity_level as Profile['activity'], goal: x.goal as Profile['goal'], u: ms(x.updated_at),
  }
}

// ---------------------------------------------------------------- sessions + workout_sets
const sessionToRow = (s: WorkoutSession, userId: string): Row => ({
  user_id: userId, id: s.id, date: s.date, routine_name: s.routineName, started_at: s.startedAt, duration_sec: s.durationSec,
  intensity: s.intensity, kcal: s.kcal, volume: s.volume, pr_count: s.prCount, updated_at: new Date(s.u).toISOString(),
})

const setsToRows = (s: WorkoutSession, userId: string): Row[] =>
  s.exercises.flatMap((e, ei) =>
    e.sets.map((set, si) => ({
      user_id: userId, id: `${s.id}:${ei}:${si}`, session_id: s.id, exercise_id: e.exerciseId, exercise_order: ei, set_order: si,
      kg: set.kg, reps: set.reps, done: set.done, pr: Boolean(set.pr), rest_sec: si === 0 ? (e.restSec ?? null) : null,
    })),
  )

function rebuildSession(x: Row, sets: Row[]): WorkoutSession {
  const byEx = new Map<number, { id: string; restSec?: number; sets: Row[] }>()
  for (const r of sets) {
    const o = num(r.exercise_order)
    const cur = byEx.get(o) ?? { id: String(r.exercise_id), sets: [] }
    cur.sets.push(r)
    if (r.rest_sec != null) cur.restSec = num(r.rest_sec)
    byEx.set(o, cur)
  }
  const exercises: SessionExercise[] = [...byEx.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, e]) => ({
      exerciseId: e.id,
      restSec: e.restSec,
      sets: e.sets.sort((a, b) => num(a.set_order) - num(b.set_order)).map((r) => ({ kg: num(r.kg), reps: num(r.reps), done: Boolean(r.done), pr: r.pr ? true : undefined })),
    }))
  return {
    id: String(x.id), u: ms(x.updated_at), date: String(x.date), routineName: String(x.routine_name), startedAt: num(x.started_at),
    durationSec: num(x.duration_sec), intensity: x.intensity as WorkoutSession['intensity'], kcal: num(x.kcal), volume: num(x.volume),
    prCount: num(x.pr_count), exercises,
  }
}

export interface SyncResult {
  /** merged collections (+ profile) as of `at` */
  patch: Partial<AppState>
  at: number
  sentTomb: Tomb[]
  /** server-side AI counters for today (null = unknown) */
  ai: { photo: number; text: number } | null
}

/**
 * Reconcile local data with the cloud (same rules for every collection):
 * rows on one side only are copied, on both sides the latest `u` wins, local rows that were synced
 * before (u <= lastSync) but are gone remotely were deleted elsewhere → dropped, local deletions
 * (tombstones) are applied remotely first.
 */
export async function syncAll(
  sb: SupabaseClient,
  userId: string,
  local: AppState,
  targetsFor: (p: Profile) => { kcal: number; protein: number; carbs: number; fat: number; waterMl: number },
  today: string,
): Promise<SyncResult> {
  const startedAt = Date.now()
  const patch: Partial<AppState> = {}

  // 1. propagate local deletions (workout_sets cascade from workout_sessions)
  const tables: Record<string, string> = Object.fromEntries([...SPECS.map((s) => [s.c, s.table]), ['sessions', 'workout_sessions']])
  for (const [c, table] of Object.entries(tables)) {
    const ids = local.tomb.filter((t) => t.c === c).map((t) => t.id)
    if (ids.length) {
      const { error } = await sb.from(table).delete().eq('user_id', userId).in('id', ids)
      if (error) throw error
    }
  }
  const tombIds = new Set(local.tomb.map((t) => `${t.c}:${t.id}`))

  const merge = (c: Collection, localRecs: Rec[], remote: Map<string, Rec>): { merged: Rec[]; toPush: Rec[] } => {
    const merged = new Map<string, Rec>()
    const toPush: Rec[] = []
    for (const l of localRecs.filter((r) => !tombIds.has(`${c}:${r.id}`))) {
      const r = remote.get(l.id)
      if (!r) {
        if (l.u <= local.lastSync) continue // deleted on another device
        merged.set(l.id, l)
        toPush.push(l)
      } else if (l.u > r.u) {
        merged.set(l.id, l)
        toPush.push(l)
      } else merged.set(l.id, r)
    }
    for (const [id, r] of remote) if (!merged.has(id) && !tombIds.has(`${c}:${id}`)) merged.set(id, r)
    return { merged: [...merged.values()], toPush }
  }

  // 2. 1:1 collections
  for (const sp of SPECS) {
    const remote = new Map<string, Rec>((await fetchAll(sb, sp.table)).map((r) => [String(r.id), sp.fromRow(r)]))
    const { merged, toPush } = merge(sp.c, local[sp.c] as Rec[], remote)
    for (let i = 0; i < toPush.length; i += 200) {
      const chunk = toPush.slice(i, i + 200).map((r) => ({ ...sp.toRow(r as never), user_id: userId, updated_at: new Date(r.u).toISOString() }))
      const { error } = await sb.from(sp.table).upsert(chunk, { onConflict: 'user_id,id' })
      if (error) throw error
    }
    ;(patch as Record<string, unknown>)[sp.c] = merged
  }

  // 3. sessions + sets
  const [sessionRows, setRows] = await Promise.all([fetchAll(sb, 'workout_sessions'), fetchAll(sb, 'workout_sets')])
  const setsBySession = new Map<string, Row[]>()
  for (const r of setRows) {
    const k = String(r.session_id)
    setsBySession.set(k, [...(setsBySession.get(k) ?? []), r])
  }
  const remoteSessions = new Map<string, Rec>(sessionRows.map((r) => [String(r.id), rebuildSession(r, setsBySession.get(String(r.id)) ?? [])]))
  const { merged: sessMerged, toPush: sessPush } = merge('sessions', local.sessions, remoteSessions)
  for (const s of sessPush as WorkoutSession[]) {
    const { error } = await sb.from('workout_sessions').upsert(sessionToRow(s, userId), { onConflict: 'user_id,id' })
    if (error) throw error
    const del = await sb.from('workout_sets').delete().eq('user_id', userId).eq('session_id', s.id)
    if (del.error) throw del.error
    const rows = setsToRows(s, userId)
    for (let i = 0; i < rows.length; i += 300) {
      const ins = await sb.from('workout_sets').insert(rows.slice(i, i + 300))
      if (ins.error) throw ins.error
    }
  }
  patch.sessions = sessMerged as WorkoutSession[]

  // 4. profile
  const { data: pRow, error: pErr } = await sb.from('profiles').select('*').eq('user_id', userId).maybeSingle()
  if (pErr) throw pErr
  if (pRow) {
    const remoteProfile = rowToProfile(pRow as Row)
    if (!local.profile || remoteProfile.u > local.profile.u) patch.profile = remoteProfile
    else if (local.profile.u > remoteProfile.u) {
      const { error } = await sb.from('profiles').upsert(profileToRow(local.profile, userId, targetsFor(local.profile)))
      if (error) throw error
    }
  } else if (local.profile) {
    const { error } = await sb.from('profiles').upsert(profileToRow(local.profile, userId, targetsFor(local.profile)))
    if (error) throw error
  }

  // 5. AI usage counters (read-only for clients; incremented by the serverless functions)
  let ai: SyncResult['ai'] = null
  const { data: usage } = await sb.from('ai_usage').select('kind,count').eq('user_id', userId).eq('day', today)
  if (usage) {
    const rows = usage as Row[]
    ai = { photo: num(rows.find((r) => r.kind === 'photo')?.count), text: num(rows.find((r) => r.kind === 'text')?.count) }
  }

  return { patch, at: startedAt, sentTomb: local.tomb, ai }
}
