/**
 * Step counter service.
 *
 * - Native app (Capacitor on Android/iOS): reads the day's steps from Health Connect / Apple HealthKit
 *   through `@capgo/capacitor-health`. The OS collects steps from the phone sensor around the clock, even with
 *   the screen off; the app only READS the aggregated total whenever it opens, resumes or on a timer.
 * - Browser / PWA: there is no background sensor access on the web. The service reports `web` and the UI offers
 *   quick manual entry (+1.000 / +2.500 / +5.000 / exact number). Nothing here ever throws into the UI.
 */
import { Capacitor } from '@capacitor/core'
import type { HealthPlugin } from '@capgo/capacitor-health'
import { dateKey } from '../lib/utils'

export type StepStatus = 'web' | 'unavailable' | 'needs-permission' | 'ready' | 'error'

export interface StepInfo {
  status: StepStatus
  /** human readable reason, shown in Profile / steps card */
  message: string
}

export interface DaySteps {
  /** YYYY-MM-DD (local) */
  date: string
  steps: number
}

export const isNativeApp = (): boolean => {
  try {
    return Capacitor.isNativePlatform()
  } catch {
    return false
  }
}

let cached: HealthPlugin | null | undefined
async function health(): Promise<HealthPlugin | null> {
  if (cached !== undefined) return cached
  if (!isNativeApp()) return (cached = null)
  try {
    cached = (await import('@capgo/capacitor-health')).Health
  } catch {
    cached = null
  }
  return cached
}

const errText = (e: unknown): string => (e instanceof Error ? e.message : String((e as { message?: string })?.message ?? e))

/** What can this device do right now? Never throws. */
export async function getStepInfo(): Promise<StepInfo> {
  const h = await health()
  if (!h) return { status: 'web', message: 'Modo web: el navegador no puede leer pasos en segundo plano. Usa los botones rápidos o instala la app móvil.' }
  try {
    const av = await h.isAvailable()
    if (!av.available) return { status: 'unavailable', message: av.reason ?? 'Health Connect / HealthKit no está disponible en este dispositivo.' }
    const auth = await h.checkAuthorization({ read: ['steps'] })
    return auth.readAuthorized.includes('steps')
      ? { status: 'ready', message: 'Leyendo pasos del sensor del teléfono (24/7).' }
      : { status: 'needs-permission', message: 'Falta el permiso para leer pasos.' }
  } catch (e) {
    return { status: 'error', message: errText(e) }
  }
}

/** Opens the system permission sheet. Resolves true when steps can be read. */
export async function requestStepPermission(): Promise<boolean> {
  const h = await health()
  if (!h) return false
  try {
    const res = await h.requestAuthorization({ read: ['steps'] })
    return res.readAuthorized.includes('steps')
  } catch {
    return false
  }
}

/** Aggregated steps per local day for the last `days` days (today included). Empty array when unavailable. */
export async function readSteps(days = 1): Promise<DaySteps[]> {
  const h = await health()
  if (!h) return []
  try {
    const end = new Date()
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    start.setDate(start.getDate() - (days - 1))
    const res = await h.queryAggregated({
      dataType: 'steps',
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      bucket: 'day',
      aggregation: 'sum',
    })
    const byDay = new Map<string, number>()
    for (const s of res.samples) {
      const k = dateKey(new Date(s.startDate))
      byDay.set(k, (byDay.get(k) ?? 0) + Math.round(s.value))
    }
    return [...byDay.entries()].map(([date, steps]) => ({ date, steps }))
  } catch {
    return []
  }
}

/**
 * Keeps the app in sync with the health store: reads on start, whenever the app returns to the foreground
 * and every 5 minutes while it is open. Returns an unsubscribe function. No-op on the web.
 */
export function startStepSync(onData: (d: DaySteps[]) => void, days = 2): () => void {
  if (!isNativeApp()) return () => {}
  let stopped = false
  const pull = async (): Promise<void> => {
    if (stopped || document.visibilityState === 'hidden') return
    const info = await getStepInfo()
    if (info.status !== 'ready') return
    const data = await readSteps(days)
    if (!stopped && data.length) onData(data)
  }
  void pull()
  const id = window.setInterval(() => void pull(), 5 * 60 * 1000)
  const vis = (): void => void pull()
  document.addEventListener('visibilitychange', vis)
  return () => {
    stopped = true
    window.clearInterval(id)
    document.removeEventListener('visibilitychange', vis)
  }
}
