import { Exercise, PlanRecords, Session, SetLog } from '../models';
import { newExercise, newSetLog } from './fixtures';

/**
 * Local times, so that tests pass in any time zone. The second workout starts just after midnight:
 * in Italy it is still 13 October in UTC, the export must show the local day, 14 October.
 */
export const FIRST_WORKOUT = new Date(2026, 9, 6, 19, 0).getTime();
export const SECOND_WORKOUT = new Date(2026, 9, 14, 0, 30).getTime();

function exercise(id: number, overrides: Partial<Exercise>): Exercise {
  return { id, ...newExercise({ phaseId: 1, ...overrides }) };
}

function setLog(id: number, overrides: Partial<SetLog>): SetLog {
  return { id, ...newSetLog({ fase: 7, ...overrides }) };
}

function session(id: number, startedAt: number, overrides: Partial<Session> = {}): Session {
  return { id, phaseId: 1, dayId: 1, startedAt, endedAt: startedAt + 3_600_000, ...overrides };
}

/**
 * A plan with two days. Squat is trained twice, Panca once with a set order to sort; Curl was
 * removed after being trained, Plank was never trained, and Stacco was deleted with its day.
 */
export function planRecords(): PlanRecords {
  return {
    phase: { id: 1, name: 'Luglio', fase: 7, status: 'active', importedAt: 1 },
    days: [
      { id: 1, phaseId: 1, ordine: 1, csvGiorno: 'sabato', weekday: 6 },
      { id: 2, phaseId: 1, ordine: 2, csvGiorno: '' },
    ],
    exercises: [
      exercise(11, { dayId: 1, ordine: 2, esercizio: 'Panca piana', note: 'presa larga, gomiti' }),
      exercise(10, { dayId: 1, ordine: 1, esercizio: 'Squat', ultimoKg: 82.5 }),
      exercise(12, { dayId: 1, ordine: 3, esercizio: 'Curl', stato: 'rimosso' }),
      exercise(20, {
        dayId: 2,
        ordine: 1,
        esercizio: 'Plank',
        ultimoKg: null,
        recSec: null,
        unitaCarico: 'per_braccio',
        stato: 'da_testare',
      }),
    ],
    sessions: [
      session(1, FIRST_WORKOUT),
      session(2, SECOND_WORKOUT),
      session(3, SECOND_WORKOUT + 1, { dayId: 9, outcome: 'completed' }),
    ],
    setLogs: [
      setLog(1, { sessionId: 1, exerciseId: 11, esercizio: 'Panca piana', setNo: 2, kg: 60 }),
      setLog(2, { sessionId: 1, exerciseId: 11, esercizio: 'Panca piana', setNo: 1, kg: 57.5 }),
      setLog(3, { sessionId: 1, exerciseId: 10, esercizio: 'Squat', kg: 80 }),
      setLog(4, { sessionId: 2, exerciseId: 10, esercizio: 'Squat', kg: 82.5, rip: 6 }),
      setLog(5, { sessionId: 1, exerciseId: 12, esercizio: 'Curl', kg: 12 }),
      setLog(6, { sessionId: 3, exerciseId: 99, esercizio: 'Stacco', kg: 100 }),
    ],
  };
}
