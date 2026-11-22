import { createContext, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { FoodProduct, Meal, WorkoutSummary } from './types'
import { defaultMeal, todayKey } from './utils'

export type Tab = 'hoy' | 'nutricion' | 'gimnasio' | 'actividad'
export type SheetName =
  | 'quick'
  | 'scan'
  | 'photo'
  | 'search'
  | 'product'
  | 'start'
  | 'account'
  | 'profile'
  | 'custom'

interface SheetState {
  name: SheetName
  meal: Meal
  date: string
  product?: FoodProduct
}

interface UI {
  tab: Tab
  setTab: (t: Tab) => void
  sheet: SheetState | null
  open: (name: SheetName, opts?: { meal?: Meal; product?: FoodProduct; date?: string }) => void
  close: () => void
  summary: WorkoutSummary | null
  setSummary: (s: WorkoutSummary | null) => void
}

const Ctx = createContext<UI | null>(null)

export function UIProvider({ children }: { children: ReactNode }) {
  const [tab, setTab] = useState<Tab>('hoy')
  const [sheet, setSheet] = useState<SheetState | null>(null)
  const [summary, setSummary] = useState<WorkoutSummary | null>(null)

  const value = useMemo<UI>(
    () => ({
      tab,
      setTab,
      sheet,
      open: (name, opts) =>
        setSheet((cur) => ({
          name,
          meal: opts?.meal ?? cur?.meal ?? defaultMeal(),
          date: opts?.date ?? cur?.date ?? todayKey(),
          product: opts?.product,
        })),
      close: () => setSheet(null),
      summary,
      setSummary,
    }),
    [tab, sheet, summary],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useUI(): UI {
  const c = useContext(Ctx)
  if (!c) throw new Error('useUI outside UIProvider')
  return c
}
