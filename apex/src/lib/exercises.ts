import type { CustomExercise, Muscle, Routine } from './types'

export type { Muscle }

export const MUSCLES: Muscle[] = ['Pecho', 'Espalda', 'Hombros', 'Bíceps', 'Tríceps', 'Cuádriceps', 'Isquios', 'Glúteos', 'Gemelos', 'Core']

/** Filtros visuales del selector: Pierna agrupa cuádriceps, isquios, glúteos y gemelos; Abdomen = core. */
export const GROUPS = ['Pecho', 'Espalda', 'Hombros', 'Bíceps', 'Tríceps', 'Pierna', 'Abdomen'] as const
export type Group = (typeof GROUPS)[number]

export function groupOf(m: Muscle): Group {
  if (m === 'Cuádriceps' || m === 'Isquios' || m === 'Glúteos' || m === 'Gemelos') return 'Pierna'
  if (m === 'Core') return 'Abdomen'
  return m
}

/** Colour tag per muscle group (workout cards, chips). */
export const GROUP_COLOR: Record<Group, string> = {
  Pecho: '#F43F5E',
  Espalda: '#06B6D4',
  Hombros: '#F59E0B',
  Bíceps: '#10B981',
  Tríceps: '#8B5CF6',
  Pierna: '#F97316',
  Abdomen: '#EAB308',
}

export interface Exercise {
  id: string
  name: string
  muscle: Muscle
  /** secondary muscles (count at half weight in the recovery map) */
  sec?: Muscle[]
  equipment: string
  custom?: boolean
}

const E = (id: string, name: string, muscle: Muscle, equipment: string, sec?: Muscle[]): Exercise => ({ id, name, muscle, equipment, sec })

export const EXERCISES: Exercise[] = [
  // Pecho
  E('bench-press', 'Press banca con barra', 'Pecho', 'Barra', ['Tríceps', 'Hombros']),
  E('incline-bench', 'Press inclinado con barra', 'Pecho', 'Barra', ['Hombros', 'Tríceps']),
  E('db-bench', 'Press banca con mancuernas', 'Pecho', 'Mancuernas', ['Tríceps']),
  E('incline-db', 'Press inclinado con mancuernas', 'Pecho', 'Mancuernas', ['Hombros']),
  E('chest-fly', 'Aperturas con mancuernas', 'Pecho', 'Mancuernas'),
  E('cable-fly', 'Cruce de poleas', 'Pecho', 'Polea'),
  E('pec-deck', 'Pec Deck (Aperturas en máquina)', 'Pecho', 'Máquina'),
  E('incline-multipower', 'Press inclinado en Multipower', 'Pecho', 'Multipower', ['Hombros', 'Tríceps']),
  E('chest-press-machine', 'Press de pecho en máquina', 'Pecho', 'Máquina', ['Tríceps']),
  E('pushup', 'Flexiones', 'Pecho', 'Peso corporal', ['Tríceps']),
  E('dips-chest', 'Fondos en paralelas (pecho)', 'Pecho', 'Peso corporal', ['Tríceps']),
  // Espalda
  E('deadlift', 'Peso muerto', 'Espalda', 'Barra', ['Isquios', 'Glúteos']),
  E('pullup', 'Dominadas', 'Espalda', 'Peso corporal', ['Bíceps']),
  E('chinup', 'Dominadas supinas', 'Espalda', 'Peso corporal', ['Bíceps']),
  E('lat-pulldown', 'Jalón al pecho', 'Espalda', 'Polea', ['Bíceps']),
  E('barbell-row', 'Remo con barra', 'Espalda', 'Barra', ['Bíceps']),
  E('db-row', 'Remo con mancuerna', 'Espalda', 'Mancuernas', ['Bíceps']),
  E('seated-row', 'Remo sentado en polea', 'Espalda', 'Polea', ['Bíceps']),
  E('row-unilateral', 'Remo unilateral (Dorsal)', 'Espalda', 'Polea', ['Bíceps']),
  E('row-open', 'Remo abierto (Espalda alta)', 'Espalda', 'Máquina', ['Bíceps', 'Hombros']),
  E('tbar-row', 'Remo en T', 'Espalda', 'Barra', ['Bíceps']),
  E('straight-arm', 'Pullover en polea', 'Espalda', 'Polea'),
  E('face-pull', 'Face pull', 'Espalda', 'Polea', ['Hombros']),
  E('hyperext', 'Hiperextensiones', 'Espalda', 'Banco', ['Glúteos']),
  // Hombros
  E('ohp', 'Press militar', 'Hombros', 'Barra', ['Tríceps']),
  E('db-shoulder', 'Press de hombro con mancuernas', 'Hombros', 'Mancuernas', ['Tríceps']),
  E('arnold', 'Press Arnold', 'Hombros', 'Mancuernas', ['Tríceps']),
  E('lateral-raise', 'Elevaciones laterales (Hombro lateral)', 'Hombros', 'Mancuernas'),
  E('rear-delt-cable', 'Hombro posterior en polea (Pájaros)', 'Hombros', 'Polea'),
  E('cable-lateral', 'Elevaciones laterales en polea', 'Hombros', 'Polea'),
  E('front-raise', 'Elevaciones frontales', 'Hombros', 'Mancuernas'),
  E('rear-delt-fly', 'Pájaros (deltoide posterior)', 'Hombros', 'Mancuernas'),
  E('upright-row', 'Remo al mentón', 'Hombros', 'Barra'),
  E('shrug', 'Encogimientos de trapecio', 'Hombros', 'Mancuernas'),
  // Bíceps
  E('barbell-curl', 'Curl con barra', 'Bíceps', 'Barra'),
  E('db-curl', 'Curl con mancuernas', 'Bíceps', 'Mancuernas'),
  E('hammer-curl', 'Curl martillo', 'Bíceps', 'Mancuernas'),
  E('preacher-curl', 'Curl predicador', 'Bíceps', 'Barra Z'),
  E('db-preacher', 'Curl predicador con mancuernas', 'Bíceps', 'Mancuernas'),
  E('cable-curl-uni', 'Curl de bíceps en polea unilateral', 'Bíceps', 'Polea'),
  E('cable-curl-low', 'Curl de bíceps en polea baja (Barra recta / V)', 'Bíceps', 'Polea'),
  E('incline-curl', 'Curl inclinado', 'Bíceps', 'Mancuernas'),
  E('cable-curl', 'Curl en polea', 'Bíceps', 'Polea'),
  E('conc-curl', 'Curl concentrado', 'Bíceps', 'Mancuernas'),
  // Tríceps
  E('cg-bench', 'Press banca agarre cerrado', 'Tríceps', 'Barra', ['Pecho']),
  E('skullcrusher', 'Press francés', 'Tríceps', 'Barra Z'),
  E('pushdown', 'Extensión de tríceps en polea', 'Tríceps', 'Polea'),
  E('overhead-cable-ext', 'Extensión de tríceps trasnuca en polea', 'Tríceps', 'Polea'),
  E('rope-pushdown', 'Extensión con cuerda', 'Tríceps', 'Polea'),
  E('overhead-ext', 'Extensión sobre la cabeza', 'Tríceps', 'Mancuernas'),
  E('dips-tri', 'Fondos en banco', 'Tríceps', 'Peso corporal'),
  E('kickback', 'Patada de tríceps', 'Tríceps', 'Mancuernas'),
  // Cuádriceps
  E('squat', 'Sentadilla con barra', 'Cuádriceps', 'Barra', ['Glúteos', 'Isquios']),
  E('front-squat', 'Sentadilla frontal', 'Cuádriceps', 'Barra', ['Glúteos']),
  E('leg-press', 'Prensa de piernas', 'Cuádriceps', 'Máquina', ['Glúteos']),
  E('hack-squat', 'Hack squat', 'Cuádriceps', 'Máquina', ['Glúteos']),
  E('leg-ext', 'Extensión de cuádriceps', 'Cuádriceps', 'Máquina'),
  E('bulgarian', 'Sentadilla búlgara', 'Cuádriceps', 'Mancuernas', ['Glúteos']),
  E('lunge', 'Zancadas', 'Cuádriceps', 'Mancuernas', ['Glúteos']),
  E('goblet', 'Sentadilla goblet', 'Cuádriceps', 'Mancuerna', ['Glúteos']),
  E('stepup', 'Step-up', 'Cuádriceps', 'Mancuernas', ['Glúteos']),
  // Isquios
  E('rdl', 'Peso muerto rumano', 'Isquios', 'Barra', ['Glúteos', 'Espalda']),
  E('leg-curl-lying', 'Curl femoral tumbado', 'Isquios', 'Máquina'),
  E('leg-curl-seated', 'Curl femoral sentado', 'Isquios', 'Máquina'),
  E('good-morning', 'Buenos días', 'Isquios', 'Barra', ['Glúteos']),
  E('db-rdl', 'Peso muerto rumano con mancuernas', 'Isquios', 'Mancuernas', ['Glúteos']),
  E('nordic', 'Curl nórdico', 'Isquios', 'Peso corporal'),
  // Glúteos
  E('hip-thrust', 'Hip thrust', 'Glúteos', 'Barra', ['Isquios']),
  E('glute-bridge', 'Puente de glúteo', 'Glúteos', 'Peso corporal'),
  E('cable-kickback', 'Patada de glúteo en polea', 'Glúteos', 'Polea'),
  E('abductor', 'Abducción de cadera en máquina', 'Glúteos', 'Máquina'),
  E('sumo-deadlift', 'Peso muerto sumo', 'Glúteos', 'Barra', ['Isquios', 'Cuádriceps']),
  // Gemelos
  E('standing-calf', 'Elevación de gemelos de pie', 'Gemelos', 'Máquina'),
  E('seated-calf', 'Elevación de gemelos sentado', 'Gemelos', 'Máquina'),
  E('leg-press-calf', 'Gemelos en prensa', 'Gemelos', 'Máquina'),
  // Core
  E('plank', 'Plancha', 'Core', 'Peso corporal'),
  E('crunch', 'Crunch abdominal', 'Core', 'Peso corporal'),
  E('cable-crunch', 'Crunch en polea', 'Core', 'Polea'),
  E('hanging-leg', 'Elevación de piernas colgado', 'Core', 'Peso corporal'),
  E('russian-twist', 'Giro ruso', 'Core', 'Disco'),
  E('ab-wheel', 'Rueda abdominal', 'Core', 'Rueda'),
  E('woodchop', 'Leñador en polea', 'Core', 'Polea'),
  E('side-plank', 'Plancha lateral', 'Core', 'Peso corporal'),
]

// ---- user-created exercises (kept in a module registry so non-React helpers can resolve them) ----
let customList: Exercise[] = []
export function registerCustomExercises(list: CustomExercise[]): void {
  customList = list.map((c) => ({ id: c.id, name: c.name, muscle: c.muscle, equipment: c.equipment || 'Personalizado', custom: true }))
}
export const allExercises = (): Exercise[] => [...EXERCISES, ...customList]
export const exerciseById = (id: string): Exercise | undefined => EXERCISES.find((e) => e.id === id) ?? customList.find((e) => e.id === id)

/** Only Olympic-bar lifts get the plate calculator (EZ bars excluded). */
export const isBarbell = (id: string): boolean => exerciseById(id)?.equipment === 'Barra'

// ---------------------------------------------------------------- MET per exercise (kcal estimates)
/** Multi-joint lifts → MET 6.0. Everything else is treated as isolation → MET 4.0. */
const COMPOUND = new Set([
  'bench-press', 'incline-bench', 'db-bench', 'incline-db', 'incline-multipower', 'dips-chest', 'cg-bench', 'chest-press-machine',
  'deadlift', 'pullup', 'chinup', 'lat-pulldown', 'barbell-row', 'db-row', 'seated-row', 'tbar-row', 'row-unilateral', 'row-open',
  'ohp', 'db-shoulder', 'arnold',
  'squat', 'front-squat', 'leg-press', 'hack-squat', 'bulgarian', 'lunge', 'goblet', 'stepup', 'rdl', 'db-rdl', 'sumo-deadlift', 'hip-thrust', 'good-morning',
])
export const MET_COMPOUND = 6.0
export const MET_ISOLATION = 4.0
export const exerciseMet = (id: string): number => (COMPOUND.has(id) ? MET_COMPOUND : MET_ISOLATION)

// ---------------------------------------------------------------- my weekly plan (Monday → Friday)
export interface PlanExercise {
  id: string
  sets: number
  bonus?: boolean
}
export interface PlanDay {
  /** 1 = Monday … 5 = Friday */
  day: number
  name: string
  focus: string
  exercises: PlanExercise[]
}

const P = (id: string, sets = 3, bonus = false): PlanExercise => ({ id, sets, bonus: bonus || undefined })

export const WEEK_PLAN: PlanDay[] = [
  {
    day: 1,
    name: 'Lunes',
    focus: 'Pecho, hombro y tríceps',
    exercises: [P('incline-multipower'), P('pec-deck'), P('ohp'), P('lateral-raise'), P('rear-delt-cable'), P('pushdown'), P('overhead-cable-ext')],
  },
  {
    day: 2,
    name: 'Martes',
    focus: 'Espalda y bíceps',
    exercises: [P('lat-pulldown'), P('row-unilateral'), P('row-open'), P('db-preacher'), P('cable-curl-uni'), P('hammer-curl'), P('cable-curl-low', 2, true)],
  },
  { day: 3, name: 'Miércoles', focus: 'Pierna', exercises: [] },
  {
    day: 4,
    name: 'Jueves',
    focus: 'Pecho y espalda',
    exercises: [P('incline-multipower'), P('pec-deck'), P('lat-pulldown'), P('row-unilateral'), P('row-open')],
  },
  {
    day: 5,
    name: 'Viernes',
    focus: 'Brazo entero (hombro, tríceps y bíceps)',
    exercises: [P('ohp'), P('lateral-raise'), P('rear-delt-cable'), P('pushdown'), P('overhead-cable-ext'), P('db-preacher'), P('cable-curl-uni'), P('hammer-curl'), P('cable-curl-low', 2, true)],
  },
]

export const WEEK_PROGRAM = 'Mi semana'
export const WEEK_REPS = 12
export const isWeekRoutine = (r: { id: string }): boolean => r.id.startsWith('week-')

/** Weekday routines, ready to be saved (editable and deletable like any other). */
export function weekRoutines(): Routine[] {
  const now = Date.now()
  return WEEK_PLAN.map((d) => ({
    id: `week-${d.day}`,
    u: now,
    name: d.name,
    program: WEEK_PROGRAM,
    exercises: d.exercises.map((e) => ({ exerciseId: e.id, sets: e.sets, reps: WEEK_REPS, restSec: 90, bonus: e.bonus })),
  }))
}

/** 1..5 for Mon–Fri; weekends point to Monday (the next training day). */
export function todayPlanDay(d: Date = new Date()): number {
  const w = d.getDay() // 0 = Sunday
  return w >= 1 && w <= 5 ? w : 1
}
