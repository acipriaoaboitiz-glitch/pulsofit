import { useEffect, useRef } from 'react'
import { Sheet } from '../components/Sheet'
import { ActivityPanel } from './ActivityPanel'
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
