import { Exercise, NewEntity, SetLog } from '../models';

export function newExercise(overrides: Partial<NewEntity<Exercise>> = {}): NewEntity<Exercise> {
  return {
    phaseId: 1,
    dayId: 1,
    ordine: 1,
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
    isManual: false,
    ...overrides,
  };
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
