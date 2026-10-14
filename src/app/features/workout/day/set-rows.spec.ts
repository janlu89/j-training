import { Exercise, WorkoutExercise } from '../../../core/models';
import { newExercise, newSetLog } from '../../../core/testing/fixtures';
import { DayDraft, EMPTY_DAY_DRAFT, buildRows, parseInput, setKey } from './set-rows';

const EXERCISE_ID = 7;

function entry(
  plan: Partial<Exercise>,
  recorded: [setNo: number, kg: number][] = [],
): WorkoutExercise {
  return {
    exercise: { id: EXERCISE_ID, ...newExercise({ serie: 3, rip: '8', ultimoKg: 62.5, ...plan }) },
    sets: recorded.map(([setNo, kg], index) => ({
      id: 100 + index,
      ...newSetLog({ exerciseId: EXERCISE_ID, setNo, kg, rip: 8 }),
    })),
    previous: [],
  };
}

describe('parseInput', () => {
  it('accepts comma and dot as decimal separator', () => {
    expect(parseInput({ kg: '62,5', rip: '8' })).toEqual({ kg: 62.5, rip: 8 });
    expect(parseInput({ kg: ' 62.5 ', rip: '8' })).toEqual({ kg: 62.5, rip: 8 });
  });

  it.each([
    ['', '8'],
    ['62,', '8'],
    ['abc', '8'],
    ['60', ''],
    ['60', '8,5'],
    ['-5', '8'],
  ])('rejects kg "%s" with reps "%s"', (kg, rip) => {
    expect(parseInput({ kg, rip })).toBeNull();
  });
});

describe('buildRows', () => {
  it('proposes one row per planned set, formatted in the UI language', () => {
    const rows = buildRows(entry({}), EMPTY_DAY_DRAFT, 'it');
    expect(rows.map((row) => [row.setNo, row.input.kg, row.input.rip, row.logId])).toEqual([
      [1, '62,5', '8', undefined],
      [2, '62,5', '8', undefined],
      [3, '62,5', '8', undefined],
    ]);
    expect(buildRows(entry({}), EMPTY_DAY_DRAFT, 'en')[0].input.kg).toBe('62.5');
  });

  it("shows recorded sets, proposes today's load and keeps sets beyond the plan", () => {
    const rows = buildRows(
      entry({}, [
        [1, 65],
        [4, 70],
      ]),
      EMPTY_DAY_DRAFT,
      'it',
    );
    expect(rows.map((row) => [row.setNo, row.input.kg, row.logId])).toEqual([
      [1, '65', 100],
      [2, '65', undefined],
      [3, '65', undefined],
      [4, '70', 101],
    ]);
  });

  it('prefers what the user typed and adds the extra sets requested', () => {
    const draft: DayDraft = {
      inputs: new Map([[setKey(EXERCISE_ID, 2), { kg: '6', rip: '' }]]),
      setDelta: new Map([[EXERCISE_ID, 1]]),
    };
    const rows = buildRows(entry({}), draft, 'it');

    expect(rows).toHaveLength(4);
    expect(rows[1]).toMatchObject({ input: { kg: '6', rip: '' }, values: null });
  });

  it('removes sets below the plan, but never a recorded one', () => {
    const removed: DayDraft = { inputs: new Map(), setDelta: new Map([[EXERCISE_ID, -2]]) };
    expect(buildRows(entry({}), removed, 'it')).toHaveLength(1);
    expect(buildRows(entry({}, [[2, 60]]), removed, 'it')).toHaveLength(2);
    const all: DayDraft = { inputs: new Map(), setDelta: new Map([[EXERCISE_ID, -5]]) };
    expect(buildRows(entry({}), all, 'it')).toEqual([]);
  });

  it('leaves the load empty for an exercise still to be tested', () => {
    const [row] = buildRows(entry({ ultimoKg: null, stato: 'da_testare' }), EMPTY_DAY_DRAFT, 'it');
    expect(row).toMatchObject({ input: { kg: '', rip: '8' }, values: null });
  });
});
