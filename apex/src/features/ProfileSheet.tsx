import { useState } from 'react'
import { Cloud, CloudOff, Download, Loader2, LogOut, Mail, RefreshCw, Trash2 } from 'lucide-react'
import { Sheet } from '../components/Sheet'
import { Segmented } from '../components/bits'
import { useStore } from '../lib/store'
import { useAuth } from '../lib/auth'
import { useUI } from '../lib/ui'
import { ACTIVITY_LABELS, GOAL_LABELS } from '../lib/metabolic'
import type { ActivityLevel, Goal, Profile, Sex } from '../lib/types'
import { cn, fmt, haptic } from '../lib/utils'

/** Same bounds as onboarding; all of them sit inside the database CHECK constraints. */
const LIMITS = {
  age: [14, 99],
  heightCm: [120, 230],
  weightKg: [30, 300],
  targetKg: [30, 300],
} as const

function Num({
  label,
  value,
  unit,
  min,
  max,
  onChange,
}: {
  label: string
  value: number
  unit: string
  min: number
  max: number
  onChange: (n: number) => void
}) {
  const [raw, setRaw] = useState(String(value))
  const n = parseFloat(raw)
  const bad = !Number.isFinite(n) || n < min || n > max
  return (
    <label className="block">
      <span className="label">{label}</span>
      <div className="relative mt-1.5">
        <input
          className={cn('input num pr-12', bad && '!border-fire/70')}
          inputMode="decimal"
          value={raw}
          aria-invalid={bad}
          onChange={(e) => {
            const t = e.target.value.replace(',', '.')
            if (!/^\d{0,3}(\.\d?)?$/.test(t)) return
            setRaw(t)
            const v = parseFloat(t)
            // keep the last valid value upstream while the field is out of range
            if (Number.isFinite(v) && v >= min && v <= max) onChange(v)
          }}
        />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[13px] text-white/40">{unit}</span>
      </div>
    </label>
  )
}

function CloudCard() {
  const auth = useAuth()
  const [email, setEmail] = useState('')
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [busy, setBusy] = useState(false)

  if (!auth.cloud) {
    return (
      <div className="card-raised flex items-start gap-3 p-4">
        <CloudOff size={20} className="mt-0.5 shrink-0 text-white/40" />
        <div className="text-[13px] leading-snug text-white/60">
          <b className="text-white">Modo invitado (local).</b> Tus datos viven en este dispositivo. Para sincronizar en la nube añade{' '}
          <code className="num rounded bg-white/10 px-1">VITE_SUPABASE_URL</code> y{' '}
          <code className="num rounded bg-white/10 px-1">VITE_SUPABASE_ANON_KEY</code> en tu <code className="num rounded bg-white/10 px-1">.env</code>.
        </div>
      </div>
    )
  }

  if (auth.session) {
    return (
      <div className="card-raised space-y-3 p-4">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-emerald/15 text-emerald">
            {auth.status === 'syncing' ? <Loader2 size={18} className="animate-spin" /> : <Cloud size={18} />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[14px] font-bold">{auth.email}</div>
            <div className={cn('text-[12px]', auth.status === 'error' ? 'text-fire' : 'text-white/45')}>
              {auth.status === 'syncing' ? 'Sincronizando…' : auth.status === 'error' ? `Error: ${auth.error}` : 'Sincronizado con la nube'}
            </div>
          </div>
          <button className="grid h-10 w-10 place-items-center rounded-xl bg-white/[0.06] active:scale-90" onClick={auth.syncNow} aria-label="Sincronizar ahora">
            <RefreshCw size={16} />
          </button>
        </div>
        <button className="btn-ghost w-full !py-2.5 text-[14px]" onClick={() => void auth.signOut()}>
          <LogOut size={16} /> Cerrar sesión
        </button>
      </div>
    )
  }

  return (
    <div className="card-raised space-y-3 p-4">
      <p className="text-[13px] leading-snug text-white/60">
        <b className="text-white">Guarda y sincroniza tus datos.</b> Entra con email o Google: lo que ya has registrado como invitado se sube a tu cuenta.
      </p>
      <button
        className="btn w-full bg-white text-black"
        disabled={busy}
        onClick={async () => {
          setBusy(true)
          const err = await auth.signInGoogle()
          if (err) setMsg({ ok: false, text: err })
          setBusy(false)
        }}
      >
        Continuar con Google
      </button>
      <form
        className="flex gap-2"
        onSubmit={async (e) => {
          e.preventDefault()
          if (!email.includes('@')) return
          setBusy(true)
          const err = await auth.signInEmail(email.trim())
          setMsg(err ? { ok: false, text: err } : { ok: true, text: 'Te hemos enviado un enlace mágico. Ábrelo en este dispositivo.' })
          setBusy(false)
        }}
      >
        <div className="relative flex-1">
          <Mail size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/35" />
          <input className="input pl-11" type="email" placeholder="tu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <button className="btn-primary" disabled={busy || !email.includes('@')}>
          Entrar
        </button>
      </form>
      {msg && <p className={cn('text-[12px]', msg.ok ? 'text-emerald' : 'text-fire')}>{msg.text}</p>}
    </div>
  )
}

function Body() {
  const { state, targets, saveProfile, addWeight, resetAll } = useStore()
  const p = state.profile
  const [d, setD] = useState<Omit<Profile, 'u'> | null>(p ? { ...p } : null)
  const [confirm, setConfirm] = useState(false)
  if (!p || !d || !targets) return null

  const set = <K extends keyof typeof d>(k: K, v: (typeof d)[K]) => setD((x) => (x ? { ...x, [k]: v } : x))
  const dirty = JSON.stringify({ ...p, u: 0 }) !== JSON.stringify({ ...d, u: 0 })

  const exportData = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `apex-datos-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div className="space-y-6">
      <CloudCard />

      <section className="space-y-4">
        <h3 className="label">Tu perfil</h3>
        <Segmented<Sex>
          value={d.sex}
          onChange={(v) => set('sex', v)}
          options={[
            { id: 'male', label: 'Hombre' },
            { id: 'female', label: 'Mujer' },
          ]}
        />
        <div className="grid grid-cols-2 gap-3">
          <Num label="Edad" value={d.age} unit="años" min={LIMITS.age[0]} max={LIMITS.age[1]} onChange={(n) => set('age', n)} />
          <Num label="Altura" value={d.heightCm} unit="cm" min={LIMITS.heightCm[0]} max={LIMITS.heightCm[1]} onChange={(n) => set('heightCm', n)} />
          <Num label="Peso actual" value={d.weightKg} unit="kg" min={LIMITS.weightKg[0]} max={LIMITS.weightKg[1]} onChange={(n) => set('weightKg', n)} />
          <Num label="Peso objetivo" value={d.targetKg} unit="kg" min={LIMITS.targetKg[0]} max={LIMITS.targetKg[1]} onChange={(n) => set('targetKg', n)} />
        </div>
        <label className="block">
          <span className="label">Actividad diaria</span>
          <select className="input mt-1.5" value={d.activity} onChange={(e) => set('activity', e.target.value as ActivityLevel)}>
            {(Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map((k) => (
              <option key={k} value={k}>
                {ACTIVITY_LABELS[k].name} — {ACTIVITY_LABELS[k].desc}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="label">Objetivo</span>
          <select className="input mt-1.5" value={d.goal} onChange={(e) => set('goal', e.target.value as Goal)}>
            {(Object.keys(GOAL_LABELS) as Goal[]).map((k) => (
              <option key={k} value={k}>
                {GOAL_LABELS[k].name} — {GOAL_LABELS[k].desc}
              </option>
            ))}
          </select>
        </label>
        <div className="num grid grid-cols-4 gap-2 text-center text-[12px] text-white/50">
          <div>
            <b className="block text-[17px] text-white">{fmt(targets.kcal)}</b>kcal
          </div>
          <div>
            <b className="block text-[17px] text-emerald">{targets.protein}</b>prot
          </div>
          <div>
            <b className="block text-[17px] text-fire">{targets.carbs}</b>carb
          </div>
          <div>
            <b className="block text-[17px] text-neon">{targets.fat}</b>grasa
          </div>
        </div>
        <button
          className="btn-primary w-full"
          disabled={!dirty}
          onClick={() => {
            haptic(15)
            saveProfile(d)
            if (d.weightKg !== p.weightKg) addWeight(d.weightKg)
          }}
        >
          Guardar y recalcular objetivos
        </button>
      </section>

      <section className="space-y-2.5">
        <h3 className="label">Datos</h3>
        <button className="btn-ghost w-full" onClick={exportData}>
          <Download size={17} /> Exportar mis datos (JSON)
        </button>
        <button
          className={cn('btn w-full', confirm ? 'bg-fire text-black' : 'btn-ghost text-fire')}
          onClick={() => {
            if (confirm) resetAll()
            else {
              setConfirm(true)
              window.setTimeout(() => setConfirm(false), 3000)
            }
          }}
        >
          <Trash2 size={17} /> {confirm ? 'Pulsa otra vez: borra todo lo local' : 'Borrar datos de este dispositivo'}
        </button>
      </section>
    </div>
  )
}

export function ProfileSheet() {
  const { sheet, close } = useUI()
  const open = sheet?.name === 'profile' || sheet?.name === 'account'
  return (
    <Sheet open={open} onClose={close} title="Perfil y cuenta" full>
      {open && <Body />}
    </Sheet>
  )
}
