/**
 * POST /api/analyze-food
 * Body: { image: <base64 without prefix>, mimeType?: string, hint?: string }
 * Header (optional): Authorization: Bearer <supabase access token>
 *
 * - The Gemini API key lives only here (server side).
 * - Signed-in users: 3 scans/day enforced in Postgres through the SECURITY DEFINER
 *   function `consume_ai` (called with the user's own JWT, so RLS/auth.uid() apply).
 * - Guests: best-effort per-IP limit (in-memory) + the client-side counter.
 * - Without GEMINI_API_KEY it answers 503 `ai_off`. It NEVER invents a dish.
 *
 * Self-contained on purpose: nothing is imported from `src/`.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

/** server env without depending on Node typings */
const ENV: Record<string, string | undefined> = (globalThis as unknown as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {}

const DAILY_LIMIT = 3
const TIMEOUT_MS = 28_000
export const config = { maxDuration: 60 }
/** newest first; the next one is tried if a model is retired or overloaded (GEMINI_MODEL overrides) */
const MODELS = ['gemini-3.8-flash', 'gemini-3.5-flash-lite']

interface Item {
  nombre: string
  gramos: number
  calorias: number
  proteinas_g: number
  carbohidratos_g: number
  grasas_g: number
}

interface FoodResult {
  es_comida: boolean
  nombre_plato: string
  confianza: number
  alimentos: Item[]
}

// guest limiter (per serverless instance; best effort)
const guestHits = new Map<string, { day: string; n: number }>()
const today = () => new Date().toISOString().slice(0, 10)

function guestAllowed(ip: string): boolean {
  const day = today()
  const hit = guestHits.get(ip)
  if (!hit || hit.day !== day) {
    guestHits.set(ip, { day, n: 1 })
    return true
  }
  if (hit.n >= DAILY_LIMIT) return false
  hit.n += 1
  return true
}

const num = (v: unknown, d = 0) => {
  const x = Number(v)
  return Number.isFinite(x) ? x : d
}
const pos1 = (v: unknown) => Math.max(0, Math.round(num(v) * 10) / 10)

function normalise(raw: unknown): FoodResult {
  const r = (raw ?? {}) as Record<string, unknown>
  const list = Array.isArray(r.alimentos) ? (r.alimentos as Record<string, unknown>[]) : []
  const alimentos = list
    .slice(0, 12)
    .map((a) => ({
      nombre: String(a.nombre ?? 'Alimento').slice(0, 60),
      gramos: Math.max(1, Math.round(num(a.gramos, 100))),
      calorias: Math.max(0, Math.round(num(a.calorias))),
      proteinas_g: pos1(a.proteinas_g),
      carbohidratos_g: pos1(a.carbohidratos_g),
      grasas_g: pos1(a.grasas_g),
    }))
  return {
    es_comida: r.es_comida !== false && alimentos.length > 0,
    nombre_plato: String(r.nombre_plato ?? 'Plato').slice(0, 80),
    confianza: Math.min(1, Math.max(0, num(r.confianza, 0.5))),
    alimentos,
  }
}

const PROMPT =
  'Eres un dietista-nutricionista en España. Analiza SOLO lo que se ve en la foto.\n' +
  '1. Identifica cada alimento por separado (incluye aceites, salsas, pan y bebidas visibles). Fíjate en la forma, el color y la textura antes de nombrarlo; ' +
  'ten presentes los platos habituales en España (lentejas, tortilla de patatas, arroz, pasta, legumbres, carnes a la plancha...).\n' +
  '2. Estima los gramos de cada alimento usando como referencia el tamaño del plato (24-27 cm), cubiertos y manos.\n' +
  '3. Da calorías y macros de ESA cantidad (no por 100 g), coherentes entre sí (4·proteína + 4·carbohidratos + 9·grasa ≈ calorías).\n' +
  '"nombre_plato" es un nombre corto y concreto en español. "confianza" va de 0 a 1 y debe ser baja si dudas. ' +
  'Si no hay comida o la foto no se entiende, devuelve es_comida=false y "alimentos" vacío. No inventes.'

const SCHEMA = {
  type: 'OBJECT',
  properties: {
    es_comida: { type: 'BOOLEAN' },
    nombre_plato: { type: 'STRING' },
    confianza: { type: 'NUMBER' },
    alimentos: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          nombre: { type: 'STRING' },
          gramos: { type: 'NUMBER' },
          calorias: { type: 'NUMBER' },
          proteinas_g: { type: 'NUMBER' },
          carbohidratos_g: { type: 'NUMBER' },
          grasas_g: { type: 'NUMBER' },
        },
        required: ['nombre', 'gramos', 'calorias', 'proteinas_g', 'carbohidratos_g', 'grasas_g'],
      },
    },
  },
  required: ['es_comida', 'nombre_plato', 'confianza', 'alimentos'],
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Método no permitido' })
  }

  const body = (req.body ?? {}) as { image?: string; mimeType?: string; hint?: string }
  const image = body.image
  const mimeType = body.mimeType && /^image\/(jpeg|png|webp)$/.test(body.mimeType) ? body.mimeType : 'image/jpeg'
  if (!image || typeof image !== 'string') return res.status(400).json({ error: 'Falta la imagen' })
  if (image.length > 4_000_000) return res.status(413).json({ error: 'Imagen demasiado grande' })
  const hint = typeof body.hint === 'string' ? body.hint.trim().slice(0, 200) : ''

  const key = ENV.GEMINI_API_KEY
  if (!key) return res.status(503).json({ code: 'ai_off', error: 'El análisis por foto todavía no está activado.' })

  // ---- quota ----
  const supaUrl = ENV.VITE_SUPABASE_URL ?? ENV.SUPABASE_URL
  const supaAnon = ENV.VITE_SUPABASE_ANON_KEY ?? ENV.SUPABASE_ANON_KEY
  const auth = req.headers.authorization
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null

  if (token && supaUrl && supaAnon) {
    const sb = createClient(supaUrl, supaAnon, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data, error } = await sb.rpc('consume_ai', { p_kind: 'photo' })
    if (error) return res.status(401).json({ error: 'Sesión no válida' })
    if (typeof data === 'number' && data < 0) return res.status(429).json({ error: 'Límite diario alcanzado' })
  } else {
    const fwd = req.headers['x-forwarded-for']
    const ip = (Array.isArray(fwd) ? fwd[0] : fwd)?.split(',')[0]?.trim() ?? 'unknown'
    if (!guestAllowed(ip)) return res.status(429).json({ error: 'Límite diario alcanzado' })
  }

  // ---- Gemini Vision ----
  const text = hint ? `${PROMPT}\n\nEl usuario describe lo que ha comido (úsalo para identificar y cuantificar): «${hint}»` : PROMPT
  const payload = JSON.stringify({
    contents: [{ role: 'user', parts: [{ inlineData: { mimeType, data: image } }, { text }] }],
    generationConfig: { temperature: 0.1, responseMimeType: 'application/json', responseSchema: SCHEMA },
  })
  const models = ENV.GEMINI_MODEL ? [ENV.GEMINI_MODEL, ...MODELS] : MODELS

  let status = 0
  try {
    for (const model of models) {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: payload,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      }).catch(() => null)
      if (!r) {
        status = 504 // too slow: try the lighter model
        continue
      }
      if (!r.ok) {
        status = r.status
        if (r.status === 404 || r.status === 429 || r.status >= 500) continue // retired / busy: try the next model
        break
      }
      const json = (await r.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] }
      const out = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? ''
      if (!out) return res.status(502).json({ error: 'Respuesta vacía de la IA' })
      return res.status(200).json(normalise(JSON.parse(out)))
    }
    const why = status === 504 ? 'La IA tarda demasiado. Inténtalo de nuevo.' : status === 400 || status === 403 ? 'La clave de la IA no es válida.' : status === 429 ? 'La IA está saturada o sin cuota. Prueba en un rato.' : `La IA respondió con un error (${status}).`
    return res.status(502).json({ error: why })
  } catch {
    return res.status(500).json({ error: 'No se pudo analizar la imagen' })
  }
}
