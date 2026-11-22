import { useState } from 'react'
import { Cloud, Download, Eye, EyeOff, Loader2, Lock, LogOut, Mail, RefreshCw, Trash2 } from 'lucide-react'
import { Sheet } from '../components/Sheet'
import { Segmented } from '../components/bits'
import { PillSelect } from '../components/PillSelect'
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
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const valid = /^\S+@\S+\.\S+$/.test(email.trim()) && password.length > 0

  if (auth.session) {
    return (
      <div className="card-raised space-y-3 p-4">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-full bg-emerald/15 text-emerald">{auth.status === 'syncing' ? <Loader2 size={19} className="animate-spin" /> : <Cloud size={19} />}</div>
          <div className="min-w-0 flex-1">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald/30 bg-emerald/10 px-2.5 py-1 text-[12px] font-bold text-emerald">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald" style={{ boxShadow: '0 0 8px #10B981' }} />
              Sincronizado · PC y Móvil
            </span>
            <div className="mt-1.5 truncate text-[13px] text-white/60">{auth.email}</div>
            {auth.status === 'error' && <div className="text-[12px] text-fire">No se pudo sincronizar. Reintenta en un momento.</div>}
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

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!valid || busy) return
    setBusy(true)
    setErr(null)
    const r = await auth.signInPassword(email.trim(), password)
    if (r.error) setErr(r.error)
    setBusy(false)
  }

  return (
    <form onSubmit={submit} className="card-raised space-y-3 p-4">
      <div>
        <p className="text-[15px] font-extrabold">Sincronización en la nube</p>
        <p className="mt-0.5 text-[12.5px] leading-snug text-white/50">Entra con tu cuenta privada para ver los mismos datos en el móvil y en el ordenador.</p>
      </div>
      <div className="relative">
        <Mail size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/35" />
        <input className="input pl-11" type="email" autoComplete="email" inputMode="email" placeholder="Correo electrónico" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Correo electrónico" />
      </div>
      <div className="relative">
        <Lock size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/35" />
        <input className="input pl-11 pr-12" type={show ? 'text' : 'password'} autoComplete="current-password" placeholder="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)} aria-label="Contraseña" />
        <button type="button" aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'} onClick={() => setShow((v) => !v)} className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-white/40">
          {show ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </div>
      {err && <p className="text-[13px] leading-snug text-fire">{err}</p>}
      <button className="btn-primary w-full" disabled={!valid || busy}>
        {busy && <Loader2 size={17} className="animate-spin" />}
        Entrar y sincronizar
      </button>
    </form>
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
    a.download = `pulso-datos-${new Date().toISOString().slice(0, 10)}.json`
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
        <div>
          <span className="label">Actividad diaria</span>
          <div className="mt-2">
            <PillSelect<ActivityLevel> variant="cards" label="Actividad diaria" value={d.activity} onChange={(v) => set('activity', v)} options={(Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map((k) => ({ id: k, label: ACTIVITY_LABELS[k].name, desc: ACTIVITY_LABELS[k].desc }))} />
          </div>
        </div>
        <div>
          <span className="label">Objetivo</span>
          <div className="mt-2">
            <PillSelect<Goal> variant="cards" label="Objetivo" value={d.goal} onChange={(v) => set('goal', v)} options={(Object.keys(GOAL_LABELS) as Goal[]).map((k) => ({ id: k, label: GOAL_LABELS[k].name, desc: GOAL_LABELS[k].desc }))} />
          </div>
        </div>
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
