import { useMemo, useState } from 'react'
import { Check, Search } from 'lucide-react'
import { Sheet } from '../components/Sheet'
import { EXERCISES, MUSCLES } from '../lib/exercises'
import type { Muscle } from '../lib/exercises'
import { cn, haptic } from '../lib/utils'

interface Props {
  open: boolean
  onClose: () => void
  /** called with every newly selected exercise id when pressing "Añadir" */
  onPick: (ids: string[]) => void
  exclude?: string[]
}

export function ExercisePicker({ open, onClose, onPick, exclude = [] }: Props) {
  return (
    <Sheet open={open} onClose={onClose} title="Biblioteca de ejercicios" full z={70}>
      {open && <PickerBody onClose={onClose} onPick={onPick} exclude={exclude} />}
    </Sheet>
  )
}

function PickerBody({ onClose, onPick, exclude }: Omit<Props, 'open'> & { exclude: string[] }) {
  const [muscle, setMuscle] = useState<Muscle | 'all'>('all')
  const [q, setQ] = useState('')
  const [sel, setSel] = useState<string[]>([])

  const list = useMemo(() => {
    const n = q.trim().toLowerCase()
    return EXERCISES.filter(
      (e) =>
        (muscle === 'all' || e.muscle === muscle) &&
        (!n || e.name.toLowerCase().includes(n) || e.equipment.toLowerCase().includes(n)),
    )
  }, [muscle, q])

  const toggle = (id: string) => {
    haptic(6)
    setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
  }

  return (
    <div className="flex h-full flex-col">
      <div className="relative mb-3">
        <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/35" />
        <input className="input pl-11" placeholder="Buscar ejercicio o material…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="-mx-5 mb-3 flex gap-2 overflow-x-auto px-5 pb-1">
        <button className={cn('chip', muscle === 'all' && 'chip-on')} onClick={() => setMuscle('all')}>
          Todos <span className="num text-white/40">{EXERCISES.length}</span>
        </button>
        {MUSCLES.map((m) => (
          <button key={m} className={cn('chip', muscle === m && 'chip-on')} onClick={() => setMuscle(m)}>
            {m}
          </button>
        ))}
      </div>

      <ul className="-mx-2 flex-1 overflow-y-auto">
        {list.map((e) => {
          const taken = exclude.includes(e.id)
          const on = sel.includes(e.id)
          return (
            <li key={e.id}>
              <button
                disabled={taken}
                onClick={() => toggle(e.id)}
                className="flex w-full items-center gap-3 rounded-2xl p-3 text-left active:bg-white/[0.05] disabled:opacity-35"
              >
                <div
                  className={cn(
                    'grid h-6 w-6 shrink-0 place-items-center rounded-lg border-2 transition',
                    on || taken ? 'border-neon bg-neon text-white' : 'border-white/20',
                  )}
                >
                  {(on || taken) && <Check size={14} strokeWidth={4} />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14px] font-bold">{e.name}</div>
                  <div className="text-[12px] text-white/45">
                    {e.muscle} · {e.equipment}
                  </div>
                </div>
              </button>
            </li>
          )
        })}
        {list.length === 0 && <li className="py-10 text-center text-sm text-white/40">Sin resultados</li>}
      </ul>

      <button
        className="btn-violet mt-3 w-full"
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
