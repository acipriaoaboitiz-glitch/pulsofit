import type { Meal } from './types'

export const cn = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')

export const uid = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
        const r = (Math.random() * 16) | 0
        return (ch === 'x' ? r : (r & 0x3) | 0x8).toString(16)
      })

export function dateKey(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export const todayKey = () => dateKey()

export function addDays(key: string, delta: number): string {
  const [y, m, d] = key.split('-').map(Number)
  return dateKey(new Date(y, m - 1, d + delta))
}

export function keyToDate(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function prettyDate(key: string): string {
  const t = todayKey()
  if (key === t) return 'Hoy'
  if (key === addDays(t, -1)) return 'Ayer'
  if (key === addDays(t, 1)) return 'Mañana'
  return keyToDate(key).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })
}

export function greeting(): string {
  const h = new Date().getHours()
  if (h < 6) return 'Buenas noches'
  if (h < 13) return 'Buenos días'
  if (h < 21) return 'Buenas tardes'
  return 'Buenas noches'
}

export const MEALS: { id: Meal; label: string; emoji: string }[] = [
  { id: 'desayuno', label: 'Desayuno', emoji: '🥣' },
  { id: 'comida', label: 'Comida', emoji: '🍛' },
  { id: 'cena', label: 'Cena', emoji: '🍽️' },
  { id: 'snack', label: 'Snack', emoji: '🍎' },
]

export function defaultMeal(): Meal {
  const h = new Date().getHours()
  if (h < 11) return 'desayuno'
  if (h < 16) return 'comida'
  if (h < 19) return 'snack'
  return 'cena'
}

export const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n))

export const round1 = (n: number) => Math.round(n * 10) / 10

/** Spanish thousands separator, also for 4-digit numbers (es-ES omits it: 5000 → 5.000) */
export const fmt = (n: number) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')

export function fmtClock(totalSec: number): string {
  const s = Math.max(0, Math.round(totalSec))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const mm = String(m).padStart(h > 0 ? 2 : 1, '0')
  const ss = String(sec).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

export function haptic(pattern: number | number[] = 12): void {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(pattern)
  } catch {
    /* unsupported */
  }
}

let audioCtx: AudioContext | null = null

function ctx(): AudioContext | null {
  const Ctor: typeof AudioContext | undefined =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  audioCtx = audioCtx ?? new Ctor()
  return audioCtx
}

/** Call from a tap handler: iOS only lets audio start after a user gesture. */
export function primeAudio(): void {
  try {
    void ctx()?.resume()
  } catch {
    /* ignore */
  }
}
/** Short sound cue (rest timer end, PR). Silently ignored when audio is blocked. */
export function beep(times = 3): void {
  try {
    const c = ctx()
    if (!c) return
    void c.resume()
    for (let i = 0; i < times; i++) {
      const osc = c.createOscillator()
      const gain = c.createGain()
      osc.type = 'sine'
      osc.frequency.value = i === times - 1 ? 1175 : 880
      const t0 = c.currentTime + i * 0.22
      gain.gain.setValueAtTime(0.0001, t0)
      gain.gain.exponentialRampToValueAtTime(0.25, t0 + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.17)
      osc.connect(gain).connect(c.destination)
      osc.start(t0)
      osc.stop(t0 + 0.18)
    }
  } catch {
    /* ignore */
  }
}
