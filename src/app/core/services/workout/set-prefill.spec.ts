import { Exercise, WorkoutExercise } from '../../models';
import { newExercise, newSetLog } from '../../testing/fixtures';
import { plannedReps, prefillSet, toSetValues } from './set-prefill';

type Sets = [setNo: number, kg: number][];

function workoutExercise(
  plan: Partial<Exercise>,
  previous: Sets = [],
  today: Sets = [],
): WorkoutExercise {
  const logs = (sets: Sets, sessionId: number) =>
    sets.map(([setNo, kg], index) => ({
      id: sessionId * 100 + index,
      ...newSetLog({ sessionId, setNo, kg }),
    }));
  return {
    exercise: { id: 1, ...newExercise(plan) },
    sets: logs(today, 2),
    previous: logs(previous, 1),
  };
}

describe('plannedReps', () => {
  it.each([
    ['10', 1, 10],
    ['10', 4, 10],
    ['8-10', 2, 8],
    ['12-10-8', 1, 12],
    ['12-10-8', 3, 8],
    ['12-10-8', 4, 8],
    ['10-8', 2, 8],
    ['45s', 1, 45],
    ['max', 1, null],
    ['', 1, null],
  ])('reads "%s" for set %i as %s', (rip, setNo, expected) => {
    expect(plannedReps(rip, setNo)).toBe(expected);
  });
});

describe('prefillSet', () => {
  it('uses the plan load and reps when the exercise was never trained', () => {
    const entry = workoutExercise({ ultimoKg: 62.5, rip: '12-10-8' });
    expect(prefillSet(entry, 2)).toEqual({ kg: 62.5, rip: 10 });
  });

  it('prefers the load of the same set last time, set by set for pyramids', () => {
    const entry = workoutExercise({ ultimoKg: 60 }, [
      [1, 60],
      [2, 65],
      [3, 70],
    ]);
    expect(prefillSet(entry, 1).kg).toBe(60);
    expect(prefillSet(entry, 3).kg).toBe(70);
  });

  it('repeats the last set of last time for extra sets', () => {
    const entry = workoutExercise({ ultimoKg: 60 }, [
      [1, 80],
      [2, 82.5],
    ]);
    expect(prefillSet(entry, 4).kg).toBe(82.5);
  });

  it('follows the load used today for the next straight sets', () => {
    const entry = workoutExercise({ ultimoKg: 50 }, [], [[1, 52.5]]);
    expect(prefillSet(entry, 2).kg).toBe(52.5);
    expect(prefillSet(entry, 3).kg).toBe(52.5);
  });

  it("keeps last time's steps of a pyramid on top of today's load", () => {
    const pyramid: Sets = [
      [1, 60],
      [2, 65],
      [3, 70],
    ];
    const entry = workoutExercise({ ultimoKg: 60 }, pyramid, [[1, 62.5]]);
    expect(prefillSet(entry, 2).kg).toBe(67.5);
    expect(prefillSet(entry, 3).kg).toBe(72.5);
    expect(prefillSet(entry, 4).kg).toBe(72.5);
  });

  it('never proposes a negative load', () => {
    const entry = workoutExercise(
      {},
      [
        [1, 20],
        [2, 0],
      ],
      [[1, 10]],
    );
    expect(prefillSet(entry, 2).kg).toBe(0);
  });

  it('leaves the load empty for an exercise still to be tested', () => {
    expect(prefillSet(workoutExercise({ ultimoKg: null, stato: 'da_testare' }), 1).kg).toBeNull();
  });

  it('proposes 0 kg for active bodyweight exercises without a plan load', () => {
    expect(prefillSet(workoutExercise({ ultimoKg: null, stato: 'attivo' }), 1).kg).toBe(0);
  });
});

describe('toSetValues', () => {
  it('accepts a load (also 0 for bodyweight) with at least one rep', () => {
    expect(toSetValues({ kg: 62.5, rip: 8 })).toEqual({ kg: 62.5, rip: 8 });
    expect(toSetValues({ kg: 0, rip: 12 })).toEqual({ kg: 0, rip: 12 });
  });

  it.each([
    [null, 8],
    [60, null],
    [-5, 8],
    [60, 0],
    [60, 7.5],
    [Number.NaN, 8],
    [1001, 8],
  ])('rejects kg %s with %s reps', (kg, rip) => {
    expect(toSetValues({ kg, rip })).toBeNull();
  });
});
