import { planRecords } from '../../testing/plan-records';
import { planRows, planSetRows, setRows } from './plan-export-rows';

describe('plan export rows', () => {
  it('lists the visible exercises day by day in plan order', () => {
    const rows = planRows(planRecords());

    expect(rows.map(({ day, exercise }) => [day.ordine, exercise.esercizio])).toEqual([
      [1, 'Squat'],
      [1, 'Panca piana'],
      [2, 'Plank'],
    ]);
  });

  it('lists every set as a diary: by workout, plan order, set number', () => {
    const rows = setRows(planRecords());

    expect(rows.map(({ session, set }) => [session.id, set.esercizio, set.setNo])).toEqual([
      [1, 'Squat', 1],
      [1, 'Panca piana', 1],
      [1, 'Panca piana', 2],
      [1, 'Curl', 1],
      [2, 'Squat', 1],
      [3, 'Stacco', 1],
    ]);
    expect(rows.at(-1)?.day).toBeUndefined();
    expect(rows.at(-1)?.exercise).toBeUndefined();
  });

  it('expands the plan with its history in one flat table, leaving no set out', () => {
    const rows = planSetRows(planRecords());

    expect(
      rows.map(({ exercise, session, set }) => [exercise?.esercizio, session?.id, set?.kg]),
    ).toEqual([
      ['Squat', 1, 80],
      ['Squat', 2, 82.5],
      ['Panca piana', 1, 57.5],
      ['Panca piana', 1, 60],
      // Removed, but trained: its sets stay.
      ['Curl', 1, 12],
      // Planned, never trained: listed once without set.
      ['Plank', undefined, undefined],
      // Deleted with its day.
      [undefined, 3, 100],
    ]);
  });

  it('leaves out a removed exercise that was never trained', () => {
    const records = planRecords();
    records.setLogs = records.setLogs.filter((log) => log.esercizio !== 'Curl');

    expect(planSetRows(records).map((row) => row.exercise?.esercizio)).not.toContain('Curl');
  });
});
