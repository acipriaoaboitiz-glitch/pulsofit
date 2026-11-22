import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  ActivityLog,
  AppState,
  Collection,
  FoodLog,
  Profile,
  Routine,
  SavedFood,
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

const SPECS: Spec[] = [
  spec<FoodLog>(
    'food',
    'food_logs',
    (r) => ({
      id: r.id,
      date: r.date,
      meal: r.meal,
      name: r.name,
      brand: r.brand ?? null,
      grams: r.grams,
      kcal: r.kcal,
      protein: r.protein,
      carbs: r.carbs,
      fat: r.fat,
      source: r.source,
      image: r.image ?? null,
    }),
    (x) => ({
      id: String(x.id),
      u: ms(x.updated_at),
      date: String(x.date),
      meal: x.meal as FoodLog['meal'],
      name: String(x.name),
      brand: str(x.brand),
      grams: num(x.grams),
      kcal: num(x.kcal),
      protein: num(x.protein),
      carbs: num(x.carbs),
      fat: num(x.fat),
      source: x.source as FoodLog['source'],
      image: str(x.image),
    }),
  ),
  spec<WaterLog>(
    'water',
    'water_logs',
    (r) => ({ id: r.id, date: r.date, ml: r.ml }),
    (x) => ({ id: String(x.id), u: ms(x.updated_at), date: String(x.date), ml: num(x.ml) }),
  ),
  spec<ActivityLog>(
    'activity',
    'activity_logs',
    (r) => ({
      id: r.id,
      date: r.date,
      type: r.type,
      steps: r.steps ?? null,
      cardio: r.cardio ?? null,
      minutes: r.minutes ?? null,
      kcal: r.kcal,
    }),
    (x) => ({
      id: String(x.id),
      u: ms(x.updated_at),
      date: String(x.date),
      type: x.type as ActivityLog['type'],
      steps: x.steps == null ? undefined : num(x.steps),
      cardio: x.cardio == null ? undefined : (x.cardio as ActivityLog['cardio']),
      minutes: x.minutes == null ? undefined : num(x.minutes),
      kcal: num(x.kcal),
    }),
  ),
  spec<WeightLog>(
    'weights',
    'weight_logs',
    (r) => ({ id: r.id, date: r.date, kg: r.kg }),
    (x) => ({ id: String(x.id), u: ms(x.updated_at), date: String(x.date), kg: num(x.kg) }),
  ),
  spec<SavedFood>(
    'saved',
    'saved_foods',
    (r) => ({
      id: r.id,
      name: r.name,
      brand: r.brand ?? null,
      kcal100: r.kcal100,
      protein100: r.protein100,
      carbs100: r.carbs100,
      fat100: r.fat100,
      serving_g: r.servingG,
    }),
    (x) => ({
      id: String(x.id),
      u: ms(x.updated_at),
      name: String(x.name),
      brand: str(x.brand),
      kcal100: num(x.kcal100),
      protein100: num(x.protein100),
      carbs100: num(x.carbs100),
      fat100: num(x.fat100),
      servingG: num(x.serving_g),
    }),
  ),
  spec<Routine>(
    'routines',
    'workout_routines',
    (r) => ({ id: r.id, name: r.name, program: r.program, exercises: r.exercises }),
    (x) => ({
      id: String(x.id),
      u: ms(x.updated_at),
      name: String(x.name),
      program: String(x.program ?? ''),
      exercises: (x.exercises as Routine['exercises']) ?? [],
    }),
  ),
  spec<WorkoutSession>(
    'sessions',
    'workout_sessions',
    (r) => ({
      id: r.id,
      date: r.date,
      routine_name: r.routineName,
      started_at: r.startedAt,
      duration_sec: r.durationSec,
      intensity: r.intensity,
      kcal: r.kcal,
      volume: r.volume,
      pr_count: r.prCount,
      exercises: r.exercises,
    }),
    (x) => ({
      id: String(x.id),
      u: ms(x.updated_at),
      date: String(x.date),
      routineName: String(x.routine_name),
      startedAt: num(x.started_at),
      durationSec: num(x.duration_sec),
      intensity: x.intensity as WorkoutSession['intensity'],
      kcal: num(x.kcal),
      volume: num(x.volume),
      prCount: num(x.pr_count),
      exercises: (x.exercises as WorkoutSession['exercises']) ?? [],
    }),
  ),
]

const PAGE = 1000

async function fetchAll(sb: SupabaseClient, table: string): Promise<Row[]> {
  const out: Row[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await sb
      .from(table)
      .select('*')
      .order('id', { ascending: true })
      .range(from, from + PAGE - 1)
    if (error) throw error
    out.push(...((data as Row[]) ?? []))
    if (!data || data.length < PAGE) break
  }
  return out
}

export function isDirty(s: AppState): boolean {
  if (s.tomb.length > 0) return true
  if (s.profile && s.profile.u > s.lastSync) return true
  return SPECS.some((sp) => (s[sp.c] as Rec[]).some((r) => r.u > s.lastSync))
}

function profileToRow(p: Profile, userId: string, t: { kcal: number; protein: number; carbs: number; fat: number; waterMl: number }): Row {
  return {
    user_id: userId,
    sex: p.sex,
    age: p.age,
    height_cm: p.heightCm,
    weight_kg: p.weightKg,
    target_weight_kg: p.targetKg,
    activity_level: p.activity,
    goal: p.goal,
    kcal_target: t.kcal,
    protein_target: t.protein,
    carbs_target: t.carbs,
    fat_target: t.fat,
    water_target_ml: t.waterMl,
    updated_at: new Date(p.u).toISOString(),
  }
}

function rowToProfile(x: Row): Profile {
  return {
    sex: x.sex as Profile['sex'],
    age: num(x.age),
    heightCm: num(x.height_cm),
    weightKg: num(x.weight_kg),
    targetKg: num(x.target_weight_kg),
    activity: x.activity_level as Profile['activity'],
    goal: x.goal as Profile['goal'],
    u: ms(x.updated_at),
  }
}

export interface SyncResult {
  /** merged collections (+ profile) as of `at` */
  patch: Partial<AppState>
  /** when the sync started (becomes lastSync) */
  at: number
  /** tombstones that were propagated to the cloud */
  sentTomb: Tomb[]
  aiCount: number | null
}

/**
 * Reconcile local data with the cloud.
 * - rows only on one side are copied to the other,
 * - on both sides the most recently updated wins,
 * - local rows already synced before (u <= lastSync) but missing remotely were deleted elsewhere → dropped,
 * - local deletions (tombstones) are applied remotely first.
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

  // 1. propagate local deletions
  for (const sp of SPECS) {
    const ids = local.tomb.filter((t) => t.c === sp.c).map((t) => t.id)
    if (ids.length) {
      const { error } = await sb.from(sp.table).delete().eq('user_id', userId).in('id', ids)
      if (error) throw error
    }
  }
  const tombIds = new Set(local.tomb.map((t) => `${t.c}:${t.id}`))

  // 2. collections
  for (const sp of SPECS) {
    const remoteRows = await fetchAll(sb, sp.table)
    const remote = new Map<string, Rec>(remoteRows.map((r) => [String(r.id), sp.fromRow(r)]))
    const localRecs = (local[sp.c] as Rec[]).filter((r) => !tombIds.has(`${sp.c}:${r.id}`))
    const merged = new Map<string, Rec>()
    const toPush: Rec[] = []

    for (const l of localRecs) {
      const r = remote.get(l.id)
      if (!r) {
        if (l.u <= local.lastSync) continue // deleted on another device
        merged.set(l.id, l)
        toPush.push(l)
      } else if (l.u > r.u) {
        merged.set(l.id, l)
        toPush.push(l)
      } else {
        merged.set(l.id, r)
      }
    }
    for (const [id, r] of remote) if (!merged.has(id) && !tombIds.has(`${sp.c}:${id}`)) merged.set(id, r)

    for (let i = 0; i < toPush.length; i += 200) {
      const chunk = toPush.slice(i, i + 200).map((r) => ({
        ...sp.toRow(r as never),
        user_id: userId,
        updated_at: new Date(r.u).toISOString(),
      }))
      const { error } = await sb.from(sp.table).upsert(chunk, { onConflict: 'user_id,id' })
      if (error) throw error
    }
    ;(patch as Record<string, unknown>)[sp.c] = [...merged.values()]
  }

  // 3. profile
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

  // 4. AI scan usage (read-only for clients; incremented by the serverless function)
  let aiCount: number | null = null
  const { data: usage } = await sb.from('ai_scan_usage').select('count').eq('user_id', userId).eq('day', today).maybeSingle()
  if (usage) aiCount = num((usage as Row).count)

  return { patch, at: startedAt, sentTomb: local.tomb, aiCount }
}
