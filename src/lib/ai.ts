import { supabase } from './supabase'
import type { MagicItem } from './parser'

export interface AiItem {
  nombre: string
  gramos: number
  calorias: number
  proteinas_g: number
  carbohidratos_g: number
  grasas_g: number
}

export interface AiFoodResult {
  es_comida: boolean
  nombre_plato: string
  confianza: number
  alimentos: AiItem[]
}

/** The photo AI is not configured (or there is no server): the UI offers the other ways of logging. */
export class AiUnavailableError extends Error {
  constructor() {
    super('El análisis por foto todavía no está activado.')
  }
}

export class AiLimitError extends Error {
  constructor(message = 'Has alcanzado el límite de 3 análisis por foto de hoy.') {
    super(message)
  }
}

/** Resize to max 800 px and re-encode as JPEG 0.75; returns a data URL. */
export async function compressImage(file: Blob, maxSide = 800, quality = 0.75): Promise<string> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const w = Math.round(bitmap.width * scale)
  const h = Math.round(bitmap.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('No se pudo procesar la imagen')
  ctx.drawImage(bitmap, 0, 0, w, h)
  bitmap.close()
  return canvas.toDataURL('image/jpeg', quality)
}

/**
 * Calls the serverless endpoint. It never makes up a result: if the AI cannot answer, it throws.
 * `hint` is the optional description typed by the user, which makes the estimate far more accurate.
 */
export async function analyzeFoodPhoto(dataUrl: string, hint = ''): Promise<AiFoodResult> {
  const [meta, base64] = dataUrl.split(',')
  const mimeType = /data:(.*?);/.exec(meta)?.[1] ?? 'image/jpeg'

  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const token = (await supabase?.auth.getSession())?.data.session?.access_token
  if (token) headers.Authorization = `Bearer ${token}`

  let res: Response
  try {
    res = await fetch('/api/analyze-food', { method: 'POST', headers, body: JSON.stringify({ image: base64, mimeType, hint }) })
  } catch {
    throw new Error('Sin conexión. Revisa internet e inténtalo de nuevo.')
  }

  if (res.status === 429) throw new AiLimitError()
  const isJson = (res.headers.get('content-type') ?? '').includes('json')
  // no serverless function here (static dev server)
  if (res.status === 404 || res.status === 405 || (res.ok && !isJson)) throw new AiUnavailableError()
  if (!res.ok) {
    const j = (await res.json().catch(() => ({}))) as { error?: string; code?: string }
    if (j.code === 'ai_off') throw new AiUnavailableError()
    throw new Error(j.error ?? `Error del servidor (${res.status})`)
  }
  const data = (await res.json()) as Partial<AiFoodResult>
  if (!Array.isArray(data.alimentos)) throw new AiUnavailableError()
  return data as AiFoodResult
}

/**
 * Natural-language parsing with Gemini (`/api/quick-parse`) for text the local parser did not understand.
 * Returns null when the endpoint is unavailable (local dev / no key) so the caller keeps its local result.
 */
export async function aiQuickParse(text: string, mode: 'log' | 'food' = 'log'): Promise<MagicItem[] | null> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const token = (await supabase?.auth.getSession())?.data.session?.access_token
  if (token) headers.Authorization = `Bearer ${token}`
  let res: Response
  try {
    res = await fetch('/api/quick-parse', { method: 'POST', headers, body: JSON.stringify({ text, mode }) })
  } catch {
    return null
  }
  if (res.status === 429) throw new AiLimitError('Has alcanzado el límite diario de interpretación con IA.')
  if (!res.ok || !(res.headers.get('content-type') ?? '').includes('json')) return null
  const j = (await res.json()) as { items?: MagicItem[]; simulado?: boolean }
  if (j.simulado || !Array.isArray(j.items)) return null
  return j.items
}

let status: Promise<boolean> | null = null
/** Is the AI configured on the server? Asked once per session so the app never offers a button that cannot work. */
export function aiAvailable(): Promise<boolean> {
  status ??= fetch('/api/quick-parse')
    .then(async (r) => r.ok && (r.headers.get('content-type') ?? '').includes('json') && ((await r.json()) as { ai?: boolean }).ai === true)
    .catch(() => {
      status = null // offline: ask again later
      return false
    })
  return status
}
