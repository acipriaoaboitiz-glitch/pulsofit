import { useState } from 'react'
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import { Sheet } from '../components/Sheet'
import { Stepper } from '../components/bits'
import { ExercisePicker } from './ExercisePicker'
import { useStore } from '../lib/store'
import { exerciseById } from '../lib/exercises'
import type { Routine, RoutineExercise } from '../lib/types'
import { cn, haptic, uid } from '../lib/utils'

const RESTS = [60, 90, 120, 180]

interface Props {
  /** a routine to edit, 'new' to create, null = closed */
  target: Routine | 'new' | null
  onClose: () => void
}

export function RoutineEditor({ target, onClose }: Props) {
  return (
    <Sheet open={target !== null} onClose={onClose} title={target === 'new' ? 'Nueva rutina' : 'Editar rutina'} full>
      {target !== null && <EditorBody key={target === 'new' ? 'new' : target.id} target={target} onClose={onClose} />}
    </Sheet>
  )
}

function EditorBody({ target, onClose }: { target: Routine | 'new'; onClose: () => void }) {
  const { saveRoutine } = useStore()
  const base = target === 'new' ? null : target
  const [name, setName] = useState(base?.name ?? '')
  const [program, setProgram] = useState(base?.program ?? 'Mis rutinas')
  const [exs, setExs] = useState<RoutineExercise[]>(base?.exercises ?? [])
  const [picker, setPicker] = useState(false)

  const patch = (i: number, p: Partial<RoutineExercise>) => setExs((l) => l.map((e, j) => (j === i ? { ...e, ...p } : e)))
  const move = (i: number, d: -1 | 1) =>
    setExs((l) => {
      const j = i + d
      if (j < 0 || j >= l.length) return l
      const c = [...l]
      ;[c[i], c[j]] = [c[j], c[i]]
      return c
    })

  const save = () => {
    haptic(20)
    saveRoutine({
      id: base?.id ?? uid(),
      name: name.trim() || 'Rutina sin nombre',
      program: program.trim() || 'Mis rutinas',
      exercises: exs,
    })
    onClose()
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="label">Nombre</span>
          <input className="input mt-1.5" placeholder="Ej. Upper A" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="block">
          <span className="label">Programa</span>
          <input className="input mt-1.5" value={program} onChange={(e) => setProgram(e.target.value)} />
        </label>
      </div>

      <div className="space-y-3">
        {exs.map((re, i) => {
          const ex = exerciseById(re.exerciseId)
          return (
            <div key={re.exerciseId} className="card-raised p-4">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14px] font-extrabold">{ex?.name ?? re.exerciseId}</div>
                  <div className="text-[12px] text-white/45">{ex?.muscle}</div>
                </div>
                <button aria-label="Subir" className="grid h-8 w-8 place-items-center rounded-lg text-white/40 active:bg-white/10" onClick={() => move(i, -1)}>
                  <ArrowUp size={16} />
                </button>
                <button aria-label="Bajar" className="grid h-8 w-8 place-items-center rounded-lg text-white/40 active:bg-white/10" onClick={() => move(i, 1)}>
                  <ArrowDown size={16} />
                </button>
                <button
                  aria-label="Quitar ejercicio"
                  className="grid h-8 w-8 place-items-center rounded-lg text-white/40 active:text-fire"
                  onClick={() => setExs((l) => l.filter((_, j) => j !== i))}
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-[12px] font-bold text-white/50">Series</span>
                <Stepper value={re.sets} onChange={(n) => patch(i, { sets: n })} min={1} max={10} />
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-[12px] font-bold text-white/50">Repeticiones</span>
                <Stepper value={re.reps} onChange={(n) => patch(i, { reps: n })} min={1} max={100} />
              </div>
              <div className="mt-3 flex items-center gap-1.5">
                <span className="mr-1 text-[12px] font-bold text-white/50">Descanso</span>
                {RESTS.map((r) => (
                  <button
                    key={r}
                    onClick={() => patch(i, { restSec: r })}
                    className={cn('num flex-1 rounded-xl py-2 text-[12px] font-bold', re.restSec === r ? 'bg-neon text-white' : 'bg-white/[0.06] text-white/55')}
                  >
                    {r}s
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <button className="btn-ghost w-full" onClick={() => setPicker(true)}>
        <Plus size={18} /> Añadir ejercicios
      </button>

      <button className="btn-violet w-full" disabled={exs.length === 0} onClick={save}>
        Guardar rutina
      </button>

      <ExercisePicker
        open={picker}
        onClose={() => setPicker(false)}
        exclude={exs.map((e) => e.exerciseId)}
        onPick={(ids) => setExs((l) => [...l, ...ids.map((id): RoutineExercise => ({ exerciseId: id, sets: 3, reps: 10, restSec: 90 }))])}
      />
    </div>
  )
}
