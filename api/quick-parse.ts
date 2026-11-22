/**
 * POST /api/quick-parse
 * Body: { text: string }  → natural-language log ("200g de pollo con arroz", "press banca 4x8 80kg", "30 min de bici"…)
 * Header (optional): Authorization: Bearer <supabase access token>
 *
 * The client always runs its own offline regex parser first; this endpoint is the optional
 * "Mejorar con IA" path for phrases the local parser could not understand.
 * - GEMINI_API_KEY lives only here. Without it the endpoint answers { simulado: true } and consumes nothing.
 * - Signed-in users: capped (20/day) in Postgres via the SECURITY DEFINER function `consume_ai('text')`.
 * - Guests: best-effort per-IP cap in memory.
 *
 * Self-contained on purpose: nothing is imported from `src/`.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

/** server env without depending on Node typings */
const ENV: Record<string, string | undefined> = (globalThis as unknown as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {}

const GUEST_LIMIT = 20
const MODEL = 'gemini-2.5-flash'

const guestHits = new Map<string, { day: string; n: number }>()
function guestAllowed(ip: string): boolean {
  const day = new Date().toISOString().slice(0, 10)
  const hit = guestHits.get(ip)
  if (!hit || hit.day !== day) {
    guestHits.set(ip, { day, n: 1 })
    return true
  }
  if (hit.n >= GUEST_LIMIT) return false
  hit.n += 1
  return true
}

const num = (v: unknown, d = 0) => {
  const x = Number(v)
  return Number.isFinite(x) ? x : d
}

interface RawItem {
  kind?: string
  name?: string
  grams?: number
  kcal?: number
  protein?: number
  carbs?: number
  fat?: number
  muscle?: string
  sets?: { kg?: number; reps?: number }[]
  ml?: number
  steps?: number
  cardio?: string
  minutes?: number
}

const MUSCLES = ['Pecho', 'Espalda', 'Hombros', 'Bíceps', 'Tríceps', 'Cuádriceps', 'Isquios', 'Glúteos', 'Gemelos', 'Core']
const CARDIO = ['walk', 'run', 'bike', 'elliptical', 'swim', 'sport']

function normalise(raw: unknown): unknown[] {
  const list = (raw as { items?: RawItem[] } | null)?.items
  if (!Array.isArray(list)) return []
  const out: unknown[] = []
  for (const it of list.slice(0, 20)) {
    switch (it.kind) {
      case 'food':
        if (it.name && num(it.grams) > 0)
          out.push({
            kind: 'food',
            name: String(it.name).slice(0, 80),
            grams: Math.round(num(it.grams)),
            kcal: Math.max(0, Math.round(num(it.kcal))),
            protein: Math.max(0, Math.round(num(it.protein) * 10) / 10),
            carbs: Math.max(0, Math.round(num(it.carbs) * 10) / 10),
            fat: Math.max(0, Math.round(num(it.fat) * 10) / 10),
          })
        break
      case 'exercise': {
        const sets = (it.sets ?? []).map((s) => ({ kg: Math.max(0, num(s.kg)), reps: Math.round(num(s.reps)) })).filter((s) => s.reps > 0 && s.reps <= 200 && s.kg <= 1000).slice(0, 20)
        if (it.name && sets.length) out.push({ kind: 'exercise', name: String(it.name).slice(0, 80), muscle: MUSCLES.includes(String(it.muscle)) ? it.muscle : 'Core', sets })
        break
      }
      case 'water':
        if (num(it.ml) > 0 && num(it.ml) <= 5000) out.push({ kind: 'water', ml: Math.round(num(it.ml)) })
        break
      case 'steps':
        if (num(it.steps) > 0 && num(it.steps) <= 100000) out.push({ kind: 'steps', steps: Math.round(num(it.steps)) })
        break
      case 'cardio':
        if (CARDIO.includes(String(it.cardio)) && num(it.minutes) > 0 && num(it.minutes) <= 600) out.push({ kind: 'cardio', cardio: it.cardio, minutes: Math.round(num(it.minutes)) })
        break
    }
  }
  return out
}

const PROMPT =
  'Eres el parser de una app de fitness en español. Convierte el texto del usuario en una lista de registros. ' +
  'Tipos: "food" (alimento con gramos totales y kcal/proteína/carbos/grasas de ESA cantidad; si dice una unidad como "un plátano" estima su peso), ' +
  '"exercise" (ejercicio de gimnasio con sets [{kg, reps}]; "4x8 80kg" = 4 series de 8 reps a 80 kg; "10x70kg" = 10 reps a 70 kg; muscle uno de: ' + MUSCLES.join(', ') + '), ' +
  '"water" (ml), "steps" (pasos), "cardio" (cardio uno de: ' + CARDIO.join(', ') + ', y minutos). ' +
  'Devuelve solo lo que el usuario dijo; no inventes registros. Si no hay nada interpretable, items vacío.'

const SCHEMA = {
  type: 'OBJECT',
  properties: {
    items: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          kind: { type: 'STRING' },
          name: { type: 'STRING' },
          grams: { type: 'NUMBER' },
          kcal: { type: 'NUMBER' },
          protein: { type: 'NUMBER' },
          carbs: { type: 'NUMBER' },
          fat: { type: 'NUMBER' },
          muscle: { type: 'STRING' },
          sets: { type: 'ARRAY', items: { type: 'OBJECT', properties: { kg: { type: 'NUMBER' }, reps: { type: 'NUMBER' } } } },
          ml: { type: 'NUMBER' },
          steps: { type: 'NUMBER' },
          cardio: { type: 'STRING' },
          minutes: { type: 'NUMBER' },
        },
        required: ['kind'],
      },
    },
  },
  required: ['items'],
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Método no permitido' })
  }
  const text = (req.body as { text?: string } | undefined)?.text
  if (!text || typeof text !== 'string' || text.trim().length === 0) return res.status(400).json({ error: 'Falta el texto' })
  if (text.length > 600) return res.status(413).json({ error: 'Texto demasiado largo' })

  // simulated mode: no key configured → free, nothing consumed
  const key = ENV.GEMINI_API_KEY
  if (!key) return res.status(200).json({ simulado: true, items: [] })

  // quota
  const supaUrl = ENV.VITE_SUPABASE_URL ?? ENV.SUPABASE_URL
  const supaAnon = ENV.VITE_SUPABASE_ANON_KEY ?? ENV.SUPABASE_ANON_KEY
  const auth = req.headers.authorization
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null
  if (token && supaUrl && supaAnon) {
    const sb = createClient(supaUrl, supaAnon, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false, autoRefreshToken: false } })
    const { data, error } = await sb.rpc('consume_ai', { p_kind: 'text' })
    if (error) return res.status(401).json({ error: 'Sesión no válida' })
    if (typeof data === 'number' && data < 0) return res.status(429).json({ error: 'Límite diario alcanzado' })
  } else {
    const fwd = req.headers['x-forwarded-for']
    const ip = (Array.isArray(fwd) ? fwd[0] : fwd)?.split(',')[0]?.trim() ?? 'unknown'
    if (!guestAllowed(ip)) return res.status(429).json({ error: 'Límite diario alcanzado' })
  }

  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: `${PROMPT}\n\nTexto: """${text.trim()}"""` }] }],
        generationConfig: { temperature: 0.1, responseMimeType: 'application/json', responseSchema: SCHEMA },
      }),
    })
    if (!r.ok) return res.status(502).json({ error: `Gemini respondió ${r.status}` })
    const json = (await r.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] }
    const out = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? ''
    if (!out) return res.status(502).json({ error: 'Respuesta vacía de la IA' })
    return res.status(200).json({ items: normalise(JSON.parse(out)) })
  } catch {
    return res.status(500).json({ error: 'No se pudo interpretar el texto' })
  }
}
