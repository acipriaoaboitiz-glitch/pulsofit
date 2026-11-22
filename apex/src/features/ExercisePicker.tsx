import { useMemo, useState } from 'react'
import { Check, Plus, Search, Sparkles } from 'lucide-react'
import { Sheet } from '../components/Sheet'
import { useStore } from '../lib/store'
import { GROUPS, allExercises, exerciseById, groupOf, MUSCLES } from '../lib/exercises'
import type { Group } from '../lib/exercises'
import { frequentExercises } from '../lib/workout'
import type { Muscle } from '../lib/types'
import { cn, haptic } from '../lib/utils'

interface Props {
  open: boolean
  onClose: () => void
  /** called with every selected exercise id when pressing "Añadir" */
  onPick: (ids: string[]) => void
  exclude?: string[]
  title?: string
}

export function ExercisePicker({ open, onClose, onPick, exclude = [], title = 'Añadir ejercicio' }: Props) {
  return (
    <Sheet open={open} onClose={onClose} title={title} full z={70}>
      {open && <PickerBody onClose={onClose} onPick={onPick} exclude={exclude} />}
    </Sheet>
  )
}

function PickerBody({ onClose, onPick, exclude }: Omit<Props, 'open' | 'title'> & { exclude: string[] }) {
  const { state, addCustomExercise } = useStore()
  const [group, setGroup] = useState<Group | 'all'>('all')
  const [q, setQ] = useState('')
  const [sel, setSel] = useState<string[]>([])
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newMuscle, setNewMuscle] = useState<Muscle>('Pecho')

  const frequent = useMemo(() => frequentExercises(state.sessions, 8).filter((id) => exerciseById(id)), [state.sessions])

  const list = useMemo(() => {
    const n = q.trim().toLowerCase()
    return allExercises().filter(
      (e) => (group === 'all' || groupOf(e.muscle) === group) && (!n || e.name.toLowerCase().includes(n) || e.equipment.toLowerCase().includes(n)),
    )
  }, [group, q, state.custom])

  const toggle = (id: string) => {
    haptic(6)
    setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
  }

  const createCustom = () => {
    const name = newName.trim() || q.trim()
    if (name.length < 2) return
    const c = addCustomExercise(name, newMuscle)
    haptic(15)
    setSel((s) => [...s, c.id])
    setCreating(false)
    setNewName('')
  }

  return (
    <div className="flex h-full flex-col">
      <div className="relative mb-3">
        <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/35" />
        <input className="input pl-11" placeholder="Buscar ejercicio o material…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {frequent.length > 0 && !q && group === 'all' && (
        <div className="mb-3">
          <p className="label mb-1.5 flex items-center gap-1.5 !text-neon">
            <Sparkles size={12} /> Lo de siempre
          </p>
          <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
            {frequent.map((id) => {
              const on = sel.includes(id) || exclude.includes(id)
              return (
                <button
                  key={id}
                  disabled={exclude.includes(id)}
                  onClick={() => toggle(id)}
                  className={cn('chip max-w-[200px] shrink-0 !rounded-2xl', on && 'border-neon/60 bg-neon/15 text-violet-200')}
                >
                  {on && <Check size={13} strokeWidth={3} />}
                  <span className="truncate">{exerciseById(id)?.name}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div className="-mx-5 mb-3 flex gap-2 overflow-x-auto px-5 pb-1">
        <button className={cn('chip', group === 'all' && 'chip-on')} onClick={() => setGroup('all')}>
          Todos <span className="num text-white/40">{allExercises().length}</span>
        </button>
        {GROUPS.map((g) => (
          <button key={g} className={cn('chip', group === g && 'chip-on')} onClick={() => setGroup(g)}>
            {g}
          </button>
        ))}
      </div>

      <ul className="-mx-2 flex-1 overflow-y-auto">
        {list.map((e) => {
          const taken = exclude.includes(e.id)
          const on = sel.includes(e.id)
          return (
            <li key={e.id}>
              <button disabled={taken} onClick={() => toggle(e.id)} className="flex w-full items-center gap-3 rounded-2xl p-3 text-left active:bg-white/[0.05] disabled:opacity-35">
                <div className={cn('grid h-6 w-6 shrink-0 place-items-center rounded-lg border-2 transition', on || taken ? 'border-neon bg-neon text-white' : 'border-white/20')}>
                  {(on || taken) && <Check size={14} strokeWidth={4} />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14px] font-bold">{e.name}</div>
                  <div className="text-[12px] text-white/45">
                    {e.muscle} · {e.equipment}
                    {e.custom && <span className="ml-1.5 rounded bg-neon/20 px-1 text-[10px] font-bold text-violet-200">PROPIO</span>}
                  </div>
                </div>
              </button>
            </li>
          )
        })}
        {list.length === 0 && <li className="py-8 text-center text-sm text-white/40">Sin resultados · puedes crearlo abajo</li>}
      </ul>

      {creating ? (
        <div className="card-raised mt-3 space-y-2.5 p-3">
          <input className="input" placeholder="Nombre del ejercicio" value={newName || q} onChange={(e) => setNewName(e.target.value)} autoFocus />
          <select className="input" value={newMuscle} onChange={(e) => setNewMuscle(e.target.value as Muscle)} aria-label="Músculo principal">
            {MUSCLES.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <button className="btn-ghost !py-2.5" onClick={() => setCreating(false)}>
              Cancelar
            </button>
            <button className="btn-violet !py-2.5" onClick={createCustom}>
              Crear
            </button>
          </div>
        </div>
      ) : (
        <button className="btn-ghost mt-3 w-full !py-2.5 text-[14px]" onClick={() => setCreating(true)}>
          <Plus size={16} /> Crear ejercicio propio
        </button>
      )}

      <button
        className="btn-violet mt-2 w-full"
        disabled={sel.length === 0}
        onClick={() => {
          onPick(sel)
          onClose()
        }}
      >
        Añadir {sel.length > 0 ? `${sel.length} ejercicio${sel.length > 1 ? 's' : ''}` : ''}
      </button>
    </div>
  )
}
