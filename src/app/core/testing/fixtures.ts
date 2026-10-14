import { Exercise, ExerciseInput, NewEntity, NewPlanExercise, SetLog } from '../models';

type PlannedExercise = Omit<NewEntity<Exercise>, 'phaseId' | 'dayId'>;

const EXERCISE_INPUT: ExerciseInput = {
  esercizio: 'Panca piana',
  tipo: 'multiarticolare',
  attrezzo: 'bilanciere',
  serie: 3,
  rip: '8-10',
  posizione: '',
  ultimoKg: 60,
  unitaCarico: 'totale',
  recSec: 120,
  rir: '2',
  stato: 'attivo',
  note: '',
};

const PLANNED_EXERCISE: PlannedExercise = { ...EXERCISE_INPUT, ordine: 1, isManual: false };

export function newExerciseInput(overrides: Partial<ExerciseInput> = {}): ExerciseInput {
  return { ...EXERCISE_INPUT, ...overrides };
}

export function newExercise(overrides: Partial<NewEntity<Exercise>> = {}): NewEntity<Exercise> {
  return { phaseId: 1, dayId: 1, ...PLANNED_EXERCISE, ...overrides };
}

export function newPlanExercise(overrides: Partial<NewPlanExercise> = {}): NewPlanExercise {
  return { dayKey: 'sabato', ...PLANNED_EXERCISE, ...overrides };
}

export function newSetLog(overrides: Partial<NewEntity<SetLog>> = {}): NewEntity<SetLog> {
  return {
    sessionId: 1,
    exerciseId: 1,
    esercizio: 'Panca piana',
    fase: 1,
    date: Date.UTC(2026, 9, 1),
    setNo: 1,
    kg: 60,
    rip: 10,
    unitaCarico: 'totale',
    ...overrides,
  };
}
