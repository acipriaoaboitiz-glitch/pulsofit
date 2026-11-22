/**
 * POST /api/analyze-food
 * Body: { image: <base64 without prefix>, mimeType?: string }
 * Header (optional): Authorization: Bearer <supabase access token>
 *
 * - The Gemini API key lives only here (server side).
 * - Signed-in users: 3 scans/day enforced in Postgres through the SECURITY DEFINER
 *   function `consume_ai_scan` (called with the user's own JWT, so RLS/auth.uid() apply).
 * - Guests: best-effort per-IP limit (in-memory) + the client-side counter.
 * - Without GEMINI_API_KEY the endpoint answers with a realistic simulated result.
 *
 * Self-contained on purpose: nothing is imported from `src/`.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const DAILY_LIMIT = 3
const MODEL = 'gemini-2.5-flash'

interface FoodResult {
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

const MOCKS: FoodResult[] = [
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
]

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

function normalise(raw: unknown): FoodResult {
  const r = (raw ?? {}) as Record<string, unknown>
  return {
    nombre_plato: String(r.nombre_plato ?? 'Plato'),
    alimentos_detectados: Array.isArray(r.alimentos_detectados) ? r.alimentos_detectados.map(String) : [],
    peso_estimado_gramos: Math.max(1, Math.round(num(r.peso_estimado_gramos, 250))),
    calorias: Math.max(0, Math.round(num(r.calorias))),
    proteinas_g: Math.max(0, Math.round(num(r.proteinas_g) * 10) / 10),
    carbohidratos_g: Math.max(0, Math.round(num(r.carbohidratos_g) * 10) / 10),
    grasas_g: Math.max(0, Math.round(num(r.grasas_g) * 10) / 10),
    confianza: Math.min(1, Math.max(0, num(r.confianza, 0.5))),
  }
}

const PROMPT =
  'Eres un nutricionista experto. Analiza la foto del plato o comida. Identifica los alimentos visibles, ' +
  'estima el peso total en gramos de la ración y calcula calorías y macronutrientes totales de TODO el plato. ' +
  'Responde en español. "confianza" es un número entre 0 y 1. Si la imagen no contiene comida, ' +
  'devuelve nombre_plato "No se detecta comida", listas vacías y valores en 0 con confianza 0.'

const SCHEMA = {
  type: 'OBJECT',
  properties: {
    nombre_plato: { type: 'STRING' },
    alimentos_detectados: { type: 'ARRAY', items: { type: 'STRING' } },
    peso_estimado_gramos: { type: 'NUMBER' },
    calorias: { type: 'NUMBER' },
    proteinas_g: { type: 'NUMBER' },
    carbohidratos_g: { type: 'NUMBER' },
    grasas_g: { type: 'NUMBER' },
    confianza: { type: 'NUMBER' },
  },
  required: [
    'nombre_plato',
    'alimentos_detectados',
    'peso_estimado_gramos',
    'calorias',
    'proteinas_g',
    'carbohidratos_g',
    'grasas_g',
    'confianza',
  ],
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Método no permitido' })
  }

  const body = (req.body ?? {}) as { image?: string; mimeType?: string }
  const image = body.image
  const mimeType = body.mimeType && /^image\/(jpeg|png|webp)$/.test(body.mimeType) ? body.mimeType : 'image/jpeg'
  if (!image || typeof image !== 'string') return res.status(400).json({ error: 'Falta la imagen' })
  if (image.length > 4_000_000) return res.status(413).json({ error: 'Imagen demasiado grande' })

  // ---- simulated mode (no key configured: free, nothing is consumed) ----
  const key = process.env.GEMINI_API_KEY
  if (!key) {
    const mock = { ...MOCKS[Math.floor(Math.random() * MOCKS.length)], simulado: true }
    return res.status(200).json(mock)
  }

  // ---- quota ----
  const supaUrl = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL
  const supaAnon = process.env.VITE_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY
  const auth = req.headers.authorization
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null

  if (token && supaUrl && supaAnon) {
    const sb = createClient(supaUrl, supaAnon, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data, error } = await sb.rpc('consume_ai_scan', { p_limit: DAILY_LIMIT })
    if (error) return res.status(401).json({ error: 'Sesión no válida' })
    if (typeof data === 'number' && data < 0) return res.status(429).json({ error: 'Límite diario alcanzado' })
  } else {
    const fwd = req.headers['x-forwarded-for']
    const ip = (Array.isArray(fwd) ? fwd[0] : fwd)?.split(',')[0]?.trim() ?? 'unknown'
    if (!guestAllowed(ip)) return res.status(429).json({ error: 'Límite diario alcanzado' })
  }

  // ---- Gemini Vision ----
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ inlineData: { mimeType, data: image } }, { text: PROMPT }] }],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: 'application/json',
          responseSchema: SCHEMA,
        },
      }),
    })
    if (!r.ok) {
      return res.status(502).json({ error: `Gemini respondió ${r.status}` })
    }
    const json = (await r.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[]
    }
    const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? ''
    if (!text) {
      return res.status(502).json({ error: 'Respuesta vacía de la IA' })
    }
    return res.status(200).json(normalise(JSON.parse(text)))
  } catch {
    return res.status(500).json({ error: 'No se pudo analizar la imagen' })
  }
}
