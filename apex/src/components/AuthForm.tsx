import { useState } from 'react'
import { Eye, EyeOff, Loader2, Lock, Mail } from 'lucide-react'
import { useAuth } from '../lib/auth'
import type { AuthResult } from '../lib/auth'
import { cn } from '../lib/utils'

type Mode = 'signup' | 'login'

/** Crear cuenta / entrar (email + contraseña, Google, enlace mágico). Al entrar, los datos del modo invitado se suben a la cuenta. */
export function AuthForm({ onDone, compact = false, initialMode = 'signup' }: { onDone?: () => void; compact?: boolean; initialMode?: Mode }) {
  const auth = useAuth()
  const [mode, setMode] = useState<Mode>(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const valid = /^\S+@\S+\.\S+$/.test(email.trim()) && password.length >= 6

  const finish = (r: AuthResult, okText?: string) => {
    if (r.error) setMsg({ ok: false, text: r.error })
    else if (r.info) setMsg({ ok: true, text: r.info })
    else {
      setMsg(okText ? { ok: true, text: okText } : null)
      onDone?.()
    }
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!valid || busy) return
    setBusy(true)
    setMsg(null)
    finish(mode === 'signup' ? await auth.signUpPassword(email.trim(), password) : await auth.signInPassword(email.trim(), password))
    setBusy(false)
  }

  const needEmail = (): boolean => {
    if (/^\S+@\S+\.\S+$/.test(email.trim())) return true
    setMsg({ ok: false, text: 'Escribe tu email primero.' })
    return false
  }

  if (!auth.cloud) {
    return (
      <div className="rounded-2xl border border-line bg-white/[0.03] p-4 text-[13px] leading-snug text-white/60">
        <b className="text-white">La nube aún no está conectada.</b> Para crear una cuenta y ver tus datos en el móvil y el ordenador, añade{' '}
        <code className="num rounded bg-white/10 px-1">VITE_SUPABASE_URL</code> y <code className="num rounded bg-white/10 px-1">VITE_SUPABASE_ANON_KEY</code> al{' '}
        <code className="num rounded bg-white/10 px-1">.env</code> (ver README). Mientras tanto todo funciona en este dispositivo.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex rounded-2xl border border-line bg-raised p-1">
        {(['signup', 'login'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMode(m)
              setMsg(null)
            }}
            className={cn('flex-1 rounded-xl py-2.5 text-[14px] font-bold transition', mode === m ? 'bg-emerald text-[#04130d]' : 'text-white/55')}
          >
            {m === 'signup' ? 'Crear cuenta' : 'Entrar'}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="space-y-2.5">
        <div className="relative">
          <Mail size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/35" />
          <input className="input pl-11" type="email" autoComplete="email" inputMode="email" placeholder="tu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Email" />
        </div>
        <div className="relative">
          <Lock size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/35" />
          <input
            className="input pl-11 pr-12"
            type={show ? 'text' : 'password'}
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            placeholder={mode === 'signup' ? 'Contraseña (mín. 6)' : 'Contraseña'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-label="Contraseña"
          />
          <button type="button" aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'} onClick={() => setShow((s) => !s)} className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-white/40">
            {show ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </div>
        <button className="btn-primary w-full" disabled={!valid || busy}>
          {busy && <Loader2 size={17} className="animate-spin" />}
          {mode === 'signup' ? 'Crear cuenta y sincronizar' : 'Entrar'}
        </button>
      </form>

      <button
        type="button"
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

      <div className={cn('flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-1 text-[12px] text-white/45', compact && 'text-[11px]')}>
        <button
          type="button"
          className="underline-offset-2 hover:underline"
          onClick={async () => {
            if (!needEmail()) return
            setBusy(true)
            const err = await auth.signInEmail(email.trim())
            setMsg(err ? { ok: false, text: err } : { ok: true, text: 'Te hemos enviado un enlace mágico: ábrelo en este dispositivo.' })
            setBusy(false)
          }}
        >
          Entrar con enlace por email
        </button>
        {mode === 'login' && (
          <button
            type="button"
            className="underline-offset-2 hover:underline"
            onClick={async () => {
              if (!needEmail()) return
              setBusy(true)
              finish(await auth.resetPassword(email.trim()))
              setBusy(false)
            }}
          >
            ¿Olvidaste la contraseña?
          </button>
        )}
      </div>

      {msg && <p className={cn('text-[13px] leading-snug', msg.ok ? 'text-emerald' : 'text-fire')}>{msg.text}</p>}
    </div>
  )
}
