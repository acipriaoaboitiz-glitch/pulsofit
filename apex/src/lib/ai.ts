import { supabase } from './supabase'
import type { MagicItem } from './parser'

export interface AiFoodResult {
  nombre_plato: string
  alimentos_detectados: string[]
  peso_estimado_gramos: number
  calorias: number
  proteinas_g: number
  carbohidratos_g: number
  grasas_g: number
  confianza: number
  simulado?: boolean
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

const MOCKS: AiFoodResult[] = [
  {
    nombre_plato: 'Pollo a la plancha con arroz y brócoli',
    alimentos_detectados: ['Pechuga de pollo', 'Arroz blanco', 'Brócoli'],
    peso_estimado_gramos: 420,
    calorias: 560,
    proteinas_g: 46,
    carbohidratos_g: 62,
    grasas_g: 13,
    confianza: 0.82,
  },
  {
    nombre_plato: 'Ensalada de salmón y aguacate',
    alimentos_detectados: ['Salmón', 'Aguacate', 'Lechuga', 'Tomate cherry'],
    peso_estimado_gramos: 350,
    calorias: 470,
    proteinas_g: 31,
    carbohidratos_g: 14,
    grasas_g: 32,
    confianza: 0.77,
  },
  {
    nombre_plato: 'Tortilla de patata con ensalada',
    alimentos_detectados: ['Tortilla de patata', 'Lechuga', 'Tomate'],
    peso_estimado_gramos: 300,
    calorias: 520,
    proteinas_g: 17,
    carbohidratos_g: 36,
    grasas_g: 34,
    confianza: 0.85,
  },
  {
    nombre_plato: 'Pasta boloñesa',
    alimentos_detectados: ['Espaguetis', 'Carne picada', 'Salsa de tomate'],
    peso_estimado_gramos: 380,
    calorias: 640,
    proteinas_g: 33,
    carbohidratos_g: 82,
    grasas_g: 18,
    confianza: 0.8,
  },
]

export function mockAnalysis(): AiFoodResult {
  return { ...MOCKS[Math.floor(Math.random() * MOCKS.length)], simulado: true }
}

/**
 * Calls the serverless endpoint. In local `vite dev` (no /api) or without a
 * Gemini key the endpoint/fallback returns a realistic simulated result.
 */
export async function analyzeFoodPhoto(dataUrl: string): Promise<AiFoodResult> {
  const [meta, base64] = dataUrl.split(',')
  const mimeType = /data:(.*?);/.exec(meta)?.[1] ?? 'image/jpeg'

  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const token = (await supabase?.auth.getSession())?.data.session?.access_token
  if (token) headers.Authorization = `Bearer ${token}`

  let res: Response
  try {
    res = await fetch('/api/analyze-food', {
      method: 'POST',
      headers,
      body: JSON.stringify({ image: base64, mimeType }),
    })
  } catch {
    await new Promise((r) => setTimeout(r, 1400))
    return mockAnalysis()
  }

  if (res.status === 429) throw new AiLimitError()
  // Static dev server answers 404/405 for /api → simulated mode
  if (res.status === 404 || res.status === 405) {
    await new Promise((r) => setTimeout(r, 1400))
    return mockAnalysis()
  }
  if (!res.ok) {
    const j = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(j.error ?? `Error del servidor (${res.status})`)
  }
  const ct = res.headers.get('content-type') ?? ''
  if (!ct.includes('json')) {
    await new Promise((r) => setTimeout(r, 1400))
    return mockAnalysis()
  }
  return (await res.json()) as AiFoodResult
}

/**
 * Natural-language parsing with Gemini (`/api/quick-parse`) for text the local parser did not understand.
 * Returns null when the endpoint is unavailable (local dev / no key) so the caller keeps its local result.
 */
export async function aiQuickParse(text: string): Promise<MagicItem[] | null> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const token = (await supabase?.auth.getSession())?.data.session?.access_token
  if (token) headers.Authorization = `Bearer ${token}`
  let res: Response
  try {
    res = await fetch('/api/quick-parse', { method: 'POST', headers, body: JSON.stringify({ text }) })
  } catch {
    return null
  }
  if (res.status === 429) throw new AiLimitError('Has alcanzado el límite diario de interpretación con IA.')
  if (!res.ok || !(res.headers.get('content-type') ?? '').includes('json')) return null
  const j = (await res.json()) as { items?: MagicItem[]; simulado?: boolean }
  if (j.simulado || !Array.isArray(j.items)) return null
  return j.items
}
