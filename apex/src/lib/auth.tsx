import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { cloudEnabled, supabase } from './supabase'
import { useStore } from './store'
import { isDirty, syncAll } from './sync'
import { computeTargets } from './metabolic'
import { todayKey } from './utils'

export type SyncStatus = 'off' | 'idle' | 'syncing' | 'error'

export interface AuthResult {
  error?: string
  info?: string
}

const NO_CLOUD: AuthResult = { error: 'La sincronización no está disponible ahora mismo. Inténtalo más tarde.' }
const friendly = (m: string): string =>
  /invalid login/i.test(m) ? 'Email o contraseña incorrectos.' : /already registered|already been registered/i.test(m) ? m : /password/i.test(m) && /6|short|weak/i.test(m) ? 'La contraseña debe tener al menos 6 caracteres.' : /rate limit|too many/i.test(m) ? 'Demasiados intentos, espera un momento.' : m

interface AuthCtx {
  session: Session | null
  /** true until the stored session has been read (avoids flashing the login screen) */
  loading: boolean
  email: string | null
  cloud: boolean
  status: SyncStatus
  error: string | null
  signInPassword: (email: string, password: string) => Promise<AuthResult>
  signOut: () => Promise<void>
  syncNow: () => void
}

const Ctx = createContext<AuthCtx | null>(null)
const OWNER_KEY = 'apex.owner'

export function AuthProvider({ children }: { children: ReactNode }) {
  const store = useStore()
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(cloudEnabled)
  const [status, setStatus] = useState<SyncStatus>('off')
  const [error, setError] = useState<string | null>(null)
  const stateRef = useRef(store.state)
  stateRef.current = store.state
  const running = useRef(false)
  const userId = session?.user.id ?? null

  // Session bootstrap
  useEffect(() => {
    if (!supabase) return
    void supabase.auth
      .getSession()
      .then(({ data }) => setSession(data.session))
      .catch(() => undefined)
      .finally(() => setLoading(false))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  const run = useCallback(async () => {
    if (!supabase || !userId || running.current) return
    running.current = true
    setStatus('syncing')
    try {
      // Another account used this device before → start clean so data never mixes.
      const owner = localStorage.getItem(OWNER_KEY)
      if (owner && owner !== userId) {
        store.resetAll()
        localStorage.setItem(OWNER_KEY, userId)
        running.current = false
        setStatus('idle')
        return
      }
      localStorage.setItem(OWNER_KEY, userId)
      const res = await syncAll(supabase, userId, stateRef.current, computeTargets, todayKey())
      store.dispatch({ t: 'merge', patch: res.patch, at: res.at, sentTomb: res.sentTomb })
      if (res.ai) {
        const cur = stateRef.current.ai
        const same = cur.day === todayKey()
        store.dispatch({
          t: 'ai',
          ai: { day: todayKey(), photo: Math.max(res.ai.photo, same ? cur.photo : 0), text: Math.max(res.ai.text, same ? cur.text : 0) },
        })
      }
      setError(null)
      setStatus('idle')
    } catch (e) {
      setError(e instanceof Error ? e.message : String((e as { message?: string }).message ?? e))
      setStatus('error')
    } finally {
      running.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  // Initial sync after login
  useEffect(() => {
    if (userId) void run()
    else setStatus('off')
  }, [userId, run])

  // Debounced push whenever local data changed
  useEffect(() => {
    if (!userId || running.current || !isDirty(store.state)) return
    const t = window.setTimeout(() => void run(), 2500)
    return () => window.clearTimeout(t)
  }, [store.state, userId, run])

  // Pull on focus
  useEffect(() => {
    if (!userId) return
    const onVis = () => {
      if (document.visibilityState === 'visible') void run()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [userId, run])

  const value = useMemo<AuthCtx>(
    () => ({
      session,
      loading,
      email: session?.user.email ?? null,
      cloud: cloudEnabled,
      status,
      error,
      signInPassword: async (email, password) => {
        if (!supabase) return NO_CLOUD
        const { error: err } = await supabase.auth.signInWithPassword({ email, password })
        return err ? { error: friendly(err.message) } : {}
      },
      signOut: async () => {
        await supabase?.auth.signOut()
        setSession(null)
      },
      syncNow: () => void run(),
    }),
    [session, loading, status, error, run],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth(): AuthCtx {
  const c = useContext(Ctx)
  if (!c) throw new Error('useAuth outside AuthProvider')
  return c
}
