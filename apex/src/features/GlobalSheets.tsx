import { useEffect, useRef } from 'react'
import { Sheet } from '../components/Sheet'
import { ActivityPanel } from './ActivityPanel'
import { MagicBar } from './MagicBar'
import { ExercisePicker } from './ExercisePicker'
import { useStore } from '../lib/store'
import { useUI } from '../lib/ui'
import { buildActive, newExercise } from '../lib/workout'
import { startStepSync } from '../services/stepCounter'
import type { DaySteps } from '../services/stepCounter'

/** "Añadir Ejercicio Hoy" from the + menu. With a workout running, the workout screen opens its own picker. */
export function AddExerciseSheet() {
  const { sheet, close } = useUI()
  const { state, setActive } = useStore()
  const open = sheet?.name === 'addExercise' && !state.active
  return (
    <ExercisePicker
      open={open}
      onClose={close}
      title="Añadir ejercicio hoy"
      onPick={(ids) => setActive({ ...buildActive(null, state.sessions), exercises: ids.map((id) => newExercise(state.sessions, id)) })}
    />
  )
}

/** "Barra Mágica" from the + menu: type or dictate food, sets, water, steps or cardio. */
export function MagicSheet() {
  const { sheet, close } = useUI()
  const open = sheet?.name === 'magic'
  return (
    <Sheet open={open} onClose={close} title="Barra Mágica">
      {open && (
        <div className="pb-2">
          <p className="mb-3 text-[13px] leading-snug text-white/50">Escribe o dicta lo que has comido o entrenado y lo añado en un toque.</p>
          <MagicBar autoFocus suggestions={['200g pollo con 150g arroz', 'Press banca 4x12 60kg', '500 ml de agua', '30 min correr']} />
        </div>
      )}
    </Sheet>
  )
}

/** "Pasos / Cardio" quick log from the + menu (a sheet, not a tab jump). */
export function QuickActivitySheet() {
  const { sheet, close } = useUI()
  const open = sheet?.name === 'activity'
  return (
    <Sheet open={open} onClose={close} title="Pasos y cardio" full>
      {open && <ActivityPanel compact onDone={close} />}
    </Sheet>
  )
}

/**
 * Keeps today's steps in sync with Health Connect / HealthKit when running as a native app
 * (reads on start, on resume and every 5 min). No-op in the browser.
 */
export function StepSyncer() {
  const { setStepsTotal } = useStore()
  const ref = useRef(setStepsTotal)
  ref.current = setStepsTotal
  useEffect(() => startStepSync((days: DaySteps[]) => days.forEach((d) => ref.current(d.steps, 'health', d.date))), [])
  return null
}
