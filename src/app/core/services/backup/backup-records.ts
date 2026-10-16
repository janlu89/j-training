import {
  ClosedExercise,
  EXERCISE_OUTCOMES,
  ExerciseSubstitute,
  EXERCISE_STATUSES,
  Exercise,
  LOAD_UNITS,
  PHASE_STATUSES,
  Phase,
  SESSION_OUTCOMES,
  Session,
  SetLog,
  TrainingDay,
  WEEKDAYS,
} from '../../models';
import { RecordReader } from './record-reader';

/**
 * One reader per table. Each builds a new record from the known fields only: unknown keys in the
 * file are dropped and the return types make the compiler check that no field is forgotten.
 */
export function readPhase(r: RecordReader): Phase {
  return {
    id: r.id('id'),
    name: r.text('name'),
    fase: r.integer('fase'),
    status: r.oneOf('status', PHASE_STATUSES),
    importedAt: r.timestamp('importedAt'),
  };
}

export function readDay(r: RecordReader): TrainingDay {
  return {
    id: r.id('id'),
    phaseId: r.id('phaseId'),
    ordine: r.integer('ordine'),
    csvGiorno: r.text('csvGiorno'),
    ...r.optional('weekday', (field) => r.oneOf(field, WEEKDAYS)),
  };
}

export function readExercise(r: RecordReader): Exercise {
  return {
    id: r.id('id'),
    phaseId: r.id('phaseId'),
    dayId: r.id('dayId'),
    ordine: r.integer('ordine'),
    esercizio: r.text('esercizio'),
    tipo: r.text('tipo'),
    attrezzo: r.text('attrezzo'),
    serie: r.integer('serie'),
    rip: r.text('rip'),
    posizione: r.text('posizione'),
    ultimoKg: r.nullable('ultimoKg', (field) => r.number(field)),
    unitaCarico: r.oneOf('unitaCarico', LOAD_UNITS),
    recSec: r.nullable('recSec', (field) => r.integer(field)),
    rir: r.text('rir'),
    stato: r.oneOf('stato', EXERCISE_STATUSES),
    note: r.text('note'),
    isManual: r.boolean('isManual'),
  };
}

export function readSession(r: RecordReader): Session {
  return {
    id: r.id('id'),
    phaseId: r.id('phaseId'),
    dayId: r.id('dayId'),
    startedAt: r.timestamp('startedAt'),
    ...r.optional('endedAt', (field) => r.timestamp(field)),
    ...r.optional('outcome', (field) => r.oneOf(field, SESSION_OUTCOMES)),
    ...r.optional('closedExercises', (field) => r.records(field, readClosedExercise)),
    ...r.optional('substitutes', (field) => r.records(field, readSubstitute)),
  };
}

function readClosedExercise(r: RecordReader): ClosedExercise {
  return {
    exerciseId: r.id('exerciseId'),
    outcome: r.oneOf('outcome', EXERCISE_OUTCOMES),
  };
}

function readSubstitute(r: RecordReader): ExerciseSubstitute {
  return { exerciseId: r.id('exerciseId'), replaces: r.id('replaces') };
}

export function readSetLog(r: RecordReader): SetLog {
  return {
    id: r.id('id'),
    sessionId: r.id('sessionId'),
    exerciseId: r.id('exerciseId'),
    esercizio: r.text('esercizio'),
    fase: r.integer('fase'),
    date: r.timestamp('date'),
    setNo: r.integer('setNo', 1),
    kg: r.number('kg'),
    rip: r.number('rip'),
    unitaCarico: r.oneOf('unitaCarico', LOAD_UNITS),
    ...r.optional('rir', (field) => r.number(field)),
    ...r.optional('recSecUsed', (field) => r.integer(field)),
    ...r.optional('note', (field) => r.text(field)),
  };
}
