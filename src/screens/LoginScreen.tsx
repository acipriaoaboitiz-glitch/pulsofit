import { useState } from 'react'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Loader2, Lock, Mail } from 'lucide-react'
import { useAuth } from '../lib/auth'

/** Private sign-in (single owner account created in the Supabase dashboard). No public sign-up. */
export function LoginScreen() {
  const auth = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const valid = /^\S+@\S+\.\S+$/.test(email.trim()) && password.length > 0

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
    <div className="relative z-[1] flex h-full items-center justify-center overflow-y-auto px-6 py-10">
      <motion.div className="w-full max-w-[380px]" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>
        <div className="mb-8 flex flex-col items-center text-center">
          <svg viewBox="0 0 512 512" width="76" height="76" aria-hidden>
            <circle cx="256" cy="256" r="196" fill="#0a1411" stroke="#10B981" strokeOpacity="0.5" strokeWidth="14" />
            <polyline points="86,256 186,256 226,160 284,360 322,256 426,256" fill="none" stroke="#10B981" strokeWidth="26" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <h1 className="mt-5 text-[30px] font-extrabold leading-none" style={{ letterSpacing: '0.26em', paddingLeft: '0.26em' }}>
            PULSO
          </h1>
          <p className="mt-3 text-[13px] text-white/45">Acceso privado</p>
        </div>

        <form onSubmit={submit} className="card-raised space-y-2.5 p-4">
          <div className="relative">
            <Mail size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/35" />
            <input className="input pl-11" type="email" autoComplete="email" inputMode="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Email" />
          </div>
          <div className="relative">
            <Lock size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/35" />
            <input className="input pl-11 pr-12" type={show ? 'text' : 'password'} autoComplete="current-password" placeholder="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)} aria-label="Contraseña" />
            <button type="button" aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'} onClick={() => setShow((s) => !s)} className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-white/40">
              {show ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
          {err && <p className="px-1 text-[13px] leading-snug text-fire">{err}</p>}
          <button className="btn-primary w-full" disabled={!valid || busy}>
            {busy && <Loader2 size={17} className="animate-spin" />}
            Entrar
          </button>
        </form>
        <p className="mt-5 text-center text-[12px] text-white/30">Tus datos se sincronizan entre tu móvil y tu ordenador.</p>
      </motion.div>
    </div>
  )
}
