import type { Routine, RoutineExercise } from './types'

export type Muscle =
  | 'Pecho'
  | 'Espalda'
  | 'Hombros'
  | 'Bíceps'
  | 'Tríceps'
  | 'Cuádriceps'
  | 'Isquios'
  | 'Glúteos'
  | 'Gemelos'
  | 'Core'

export const MUSCLES: Muscle[] = [
  'Pecho',
  'Espalda',
  'Hombros',
  'Bíceps',
  'Tríceps',
  'Cuádriceps',
  'Isquios',
  'Glúteos',
  'Gemelos',
  'Core',
]

export interface Exercise {
  id: string
  name: string
  muscle: Muscle
  equipment: string
}

const E = (id: string, name: string, muscle: Muscle, equipment: string): Exercise => ({
  id,
  name,
  muscle,
  equipment,
})

export const EXERCISES: Exercise[] = [
  // Pecho
  E('bench-press', 'Press banca con barra', 'Pecho', 'Barra'),
  E('incline-bench', 'Press inclinado con barra', 'Pecho', 'Barra'),
  E('db-bench', 'Press banca con mancuernas', 'Pecho', 'Mancuernas'),
  E('incline-db', 'Press inclinado con mancuernas', 'Pecho', 'Mancuernas'),
  E('chest-fly', 'Aperturas con mancuernas', 'Pecho', 'Mancuernas'),
  E('cable-fly', 'Cruce de poleas', 'Pecho', 'Polea'),
  E('pec-deck', 'Pec deck (máquina)', 'Pecho', 'Máquina'),
  E('chest-press-machine', 'Press de pecho en máquina', 'Pecho', 'Máquina'),
  E('pushup', 'Flexiones', 'Pecho', 'Peso corporal'),
  E('dips-chest', 'Fondos en paralelas (pecho)', 'Pecho', 'Peso corporal'),
  // Espalda
  E('deadlift', 'Peso muerto', 'Espalda', 'Barra'),
  E('pullup', 'Dominadas', 'Espalda', 'Peso corporal'),
  E('chinup', 'Dominadas supinas', 'Espalda', 'Peso corporal'),
  E('lat-pulldown', 'Jalón al pecho', 'Espalda', 'Polea'),
  E('barbell-row', 'Remo con barra', 'Espalda', 'Barra'),
  E('db-row', 'Remo con mancuerna', 'Espalda', 'Mancuernas'),
  E('seated-row', 'Remo sentado en polea', 'Espalda', 'Polea'),
  E('tbar-row', 'Remo en T', 'Espalda', 'Barra'),
  E('straight-arm', 'Pullover en polea', 'Espalda', 'Polea'),
  E('face-pull', 'Face pull', 'Espalda', 'Polea'),
  E('hyperext', 'Hiperextensiones', 'Espalda', 'Banco'),
  // Hombros
  E('ohp', 'Press militar con barra', 'Hombros', 'Barra'),
  E('db-shoulder', 'Press de hombro con mancuernas', 'Hombros', 'Mancuernas'),
  E('arnold', 'Press Arnold', 'Hombros', 'Mancuernas'),
  E('lateral-raise', 'Elevaciones laterales', 'Hombros', 'Mancuernas'),
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
  E('incline-curl', 'Curl inclinado', 'Bíceps', 'Mancuernas'),
  E('cable-curl', 'Curl en polea', 'Bíceps', 'Polea'),
  E('conc-curl', 'Curl concentrado', 'Bíceps', 'Mancuernas'),
  // Tríceps
  E('cg-bench', 'Press banca agarre cerrado', 'Tríceps', 'Barra'),
  E('skullcrusher', 'Press francés', 'Tríceps', 'Barra Z'),
  E('pushdown', 'Extensión de tríceps en polea', 'Tríceps', 'Polea'),
  E('rope-pushdown', 'Extensión con cuerda', 'Tríceps', 'Polea'),
  E('overhead-ext', 'Extensión sobre la cabeza', 'Tríceps', 'Mancuernas'),
  E('dips-tri', 'Fondos en banco', 'Tríceps', 'Peso corporal'),
  E('kickback', 'Patada de tríceps', 'Tríceps', 'Mancuernas'),
  // Cuádriceps
  E('squat', 'Sentadilla con barra', 'Cuádriceps', 'Barra'),
  E('front-squat', 'Sentadilla frontal', 'Cuádriceps', 'Barra'),
  E('leg-press', 'Prensa de piernas', 'Cuádriceps', 'Máquina'),
  E('hack-squat', 'Hack squat', 'Cuádriceps', 'Máquina'),
  E('leg-ext', 'Extensión de cuádriceps', 'Cuádriceps', 'Máquina'),
  E('bulgarian', 'Sentadilla búlgara', 'Cuádriceps', 'Mancuernas'),
  E('lunge', 'Zancadas', 'Cuádriceps', 'Mancuernas'),
  E('goblet', 'Sentadilla goblet', 'Cuádriceps', 'Mancuerna'),
  E('stepup', 'Step-up', 'Cuádriceps', 'Mancuernas'),
  // Isquios
  E('rdl', 'Peso muerto rumano', 'Isquios', 'Barra'),
  E('leg-curl-lying', 'Curl femoral tumbado', 'Isquios', 'Máquina'),
  E('leg-curl-seated', 'Curl femoral sentado', 'Isquios', 'Máquina'),
  E('good-morning', 'Buenos días', 'Isquios', 'Barra'),
  E('db-rdl', 'Peso muerto rumano con mancuernas', 'Isquios', 'Mancuernas'),
  E('nordic', 'Curl nórdico', 'Isquios', 'Peso corporal'),
  // Glúteos
  E('hip-thrust', 'Hip thrust', 'Glúteos', 'Barra'),
  E('glute-bridge', 'Puente de glúteo', 'Glúteos', 'Peso corporal'),
  E('cable-kickback', 'Patada de glúteo en polea', 'Glúteos', 'Polea'),
  E('abductor', 'Abducción de cadera en máquina', 'Glúteos', 'Máquina'),
  E('sumo-deadlift', 'Peso muerto sumo', 'Glúteos', 'Barra'),
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

export const exerciseById = (id: string): Exercise | undefined => EXERCISES.find((e) => e.id === id)

const ex = (exerciseId: string, sets: number, reps: number, restSec = 90): RoutineExercise => ({
  exerciseId,
  sets,
  reps,
  restSec,
})

interface TemplateDay {
  name: string
  exercises: RoutineExercise[]
}
interface Template {
  program: string
  days: TemplateDay[]
}

export const TEMPLATES: Template[] = [
  {
    program: 'Push / Pull / Legs',
    days: [
      {
        name: 'Push',
        exercises: [
          ex('bench-press', 4, 8, 120),
          ex('incline-db', 3, 10),
          ex('ohp', 3, 8, 120),
          ex('lateral-raise', 3, 15, 60),
          ex('rope-pushdown', 3, 12, 60),
          ex('overhead-ext', 3, 12, 60),
        ],
      },
      {
        name: 'Pull',
        exercises: [
          ex('pullup', 4, 8, 120),
          ex('barbell-row', 4, 8, 120),
          ex('seated-row', 3, 10),
          ex('face-pull', 3, 15, 60),
          ex('barbell-curl', 3, 10, 60),
          ex('hammer-curl', 3, 12, 60),
        ],
      },
      {
        name: 'Legs',
        exercises: [
          ex('squat', 4, 6, 180),
          ex('rdl', 3, 8, 120),
          ex('leg-press', 3, 12),
          ex('leg-curl-lying', 3, 12, 60),
          ex('standing-calf', 4, 15, 60),
          ex('cable-crunch', 3, 15, 60),
        ],
      },
    ],
  },
  {
    program: 'Torso / Pierna',
    days: [
      {
        name: 'Torso',
        exercises: [
          ex('bench-press', 4, 8, 120),
          ex('barbell-row', 4, 8, 120),
          ex('db-shoulder', 3, 10),
          ex('lat-pulldown', 3, 10),
          ex('db-curl', 3, 12, 60),
          ex('pushdown', 3, 12, 60),
        ],
      },
      {
        name: 'Pierna',
        exercises: [
          ex('squat', 4, 6, 180),
          ex('rdl', 3, 8, 120),
          ex('bulgarian', 3, 10),
          ex('leg-curl-seated', 3, 12, 60),
          ex('hip-thrust', 3, 10, 90),
          ex('seated-calf', 4, 15, 60),
        ],
      },
    ],
  },
  {
    program: 'Full Body',
    days: [
      {
        name: 'Full Body',
        exercises: [
          ex('squat', 3, 8, 120),
          ex('bench-press', 3, 8, 120),
          ex('barbell-row', 3, 8, 120),
          ex('ohp', 3, 10),
          ex('rdl', 3, 10),
          ex('plank', 3, 45, 60),
        ],
      },
    ],
  },
]

/** Routines available from the very first launch (editable & deletable). */
export function seedRoutines(): Routine[] {
  const now = Date.now()
  return TEMPLATES.flatMap((t) =>
    t.days.map(
      (d): Routine => ({
        id: `tpl-${t.program}-${d.name}`.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        u: now,
        name: d.name,
        program: t.program,
        exercises: d.exercises.map((e) => ({ ...e })),
      }),
    ),
  )
}
