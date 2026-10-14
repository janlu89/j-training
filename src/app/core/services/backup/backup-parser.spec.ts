import { BackupFile, BackupReadResult } from '../../models';
import { newExercise, newSetLog } from '../../testing/fixtures';
import { parseBackup } from './backup-parser';

/** A small but complete backup: one plan, two days, a finished workout and one in progress. */
function validBackup(): BackupFile {
  return {
    schemaVersion: 1,
    exportedAt: '2026-10-14T18:30:00.000Z',
    phases: [{ id: 1, name: 'Luglio', fase: 7, status: 'active', importedAt: 1_000 }],
    days: [
      { id: 1, phaseId: 1, ordine: 1, csvGiorno: 'sabato', weekday: 6 },
      { id: 2, phaseId: 1, ordine: 2, csvGiorno: 'mercoledi' },
    ],
    exercises: [
      { id: 1, ...newExercise({ phaseId: 1, dayId: 1 }) },
      { id: 2, ...newExercise({ phaseId: 1, dayId: 2, ultimoKg: null, recSec: null }) },
    ],
    sessions: [
      { id: 1, phaseId: 1, dayId: 1, startedAt: 2_000, endedAt: 3_000, outcome: 'completed' },
      { id: 2, phaseId: 1, dayId: 2, startedAt: 4_000 },
    ],
    setLogs: [
      { id: 1, ...newSetLog({ sessionId: 1, exerciseId: 1, kg: 62.5 }) },
      { id: 2, ...newSetLog({ sessionId: 2, exerciseId: 2, setNo: 1 }) },
    ],
  };
}

function parse(value: unknown): BackupReadResult {
  return parseBackup(JSON.stringify(value));
}

/** A valid backup with one value changed, e.g. `withValue('setLogs', 0, 'kg', '60')`. */
function withValue(table: keyof BackupFile, index: number, field: string, value: unknown) {
  const backup = validBackup() as unknown as Record<string, Record<string, unknown>[]>;
  backup[table][index] = { ...backup[table][index], [field]: value };
  return backup;
}

describe('parseBackup', () => {
  it('accepts a backup written by the app, records unchanged', () => {
    expect(parse(validBackup())).toEqual({ ok: true, backup: validBackup() });
  });

  it('keeps absent optional fields absent and drops unknown ones', () => {
    const result = parse(withValue('days', 1, 'colour', 'red'));

    expect(result.ok && result.backup.days[1]).toStrictEqual({
      id: 2,
      phaseId: 1,
      ordine: 2,
      csvGiorno: 'mercoledi',
    });
  });

  it('accepts links to a deleted day: the history outlives the plan', () => {
    const backup = validBackup();
    backup.days = backup.days.slice(0, 1);
    backup.exercises = backup.exercises.slice(0, 1);
    backup.sessions[1] = { ...backup.sessions[1], endedAt: 5_000, outcome: 'completed' };

    expect(parse(backup).ok).toBe(true);
  });

  it('refuses a file that is not JSON', () => {
    expect(parseBackup('fase,giorno\n7,sabato')).toEqual({ ok: false, issue: { code: 'notJson' } });
  });

  it.each([
    ['an array', []],
    ['a plan CSV turned into JSON', { fase: 7, giorno: 'sabato' }],
    ['a backup without a table', { ...validBackup(), setLogs: undefined }],
    ['a backup without export date', { ...validBackup(), exportedAt: 'ieri' }],
    ['a backup without version', { ...validBackup(), schemaVersion: undefined }],
  ])('refuses %s', (_, value) => {
    expect(parse(value)).toEqual({ ok: false, issue: { code: 'notBackup' } });
  });

  it('refuses a backup made by a newer version of the app', () => {
    expect(parse({ ...validBackup(), schemaVersion: 2 })).toEqual({
      ok: false,
      issue: { code: 'newerVersion' },
    });
  });

  it.each([
    ['setLogs', 0, 'kg', '60', 'setLogs[0].kg'],
    ['setLogs', 1, 'setNo', 0, 'setLogs[1].setNo'],
    ['exercises', 1, 'stato', 'cancellato', 'exercises[1].stato'],
    ['exercises', 0, 'ultimoKg', -5, 'exercises[0].ultimoKg'],
    ['exercises', 0, 'isManual', 'no', 'exercises[0].isManual'],
    ['days', 0, 'weekday', 8, 'days[0].weekday'],
    ['phases', 0, 'id', 1.5, 'phases[0].id'],
    ['phases', 0, 'name', undefined, 'phases[0].name'],
    ['sessions', 0, 'outcome', 'done', 'sessions[0].outcome'],
  ] as const)('points at an invalid value in %s[%i].%s', (table, index, field, value, path) => {
    expect(parse(withValue(table, index, field, value))).toEqual({
      ok: false,
      issue: { code: 'invalidRecord', path },
    });
  });

  it('refuses a record that is not an object', () => {
    const backup = { ...validBackup(), sessions: [...validBackup().sessions, 'x'] };

    expect(parse(backup)).toEqual({
      ok: false,
      issue: { code: 'invalidRecord', path: 'sessions[2]' },
    });
  });

  it('refuses two records with the same id', () => {
    expect(parse(withValue('exercises', 1, 'id', 1))).toEqual({
      ok: false,
      issue: { code: 'duplicateId', path: 'exercises[1].id' },
    });
  });

  it.each([
    ['days', 1, 'phaseId', 'days[1].phaseId'],
    ['exercises', 0, 'dayId', 'exercises[0].dayId'],
    ['sessions', 0, 'phaseId', 'sessions[0].phaseId'],
    ['setLogs', 1, 'sessionId', 'setLogs[1].sessionId'],
  ] as const)('refuses a link to a missing record in %s', (table, index, field, path) => {
    expect(parse(withValue(table, index, field, 99))).toEqual({
      ok: false,
      issue: { code: 'brokenReference', path },
    });
  });

  it('refuses two active plans', () => {
    const backup = validBackup();
    backup.phases.push({ ...backup.phases[0], id: 2 });

    expect(parse(backup)).toEqual({ ok: false, issue: { code: 'multipleActivePlans' } });
  });

  it('refuses two workouts in progress', () => {
    expect(parse(withValue('sessions', 0, 'endedAt', undefined))).toEqual({
      ok: false,
      issue: { code: 'multipleOpenSessions' },
    });
  });
});
