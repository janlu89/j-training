import { newExercise } from '../../../core/testing/fixtures';
import { ExerciseRows, allSetsDone, recordedSummary, splitSections } from './exercise-sections';
import { SetRow } from './set-rows';

function row(setNo: number, kg: number, logId?: number): SetRow {
  return { setNo, input: { kg: String(kg), rip: '8' }, values: { kg, rip: 8 }, logId };
}

function item(id: number, rows: SetRow[] = [], replaces?: number): ExerciseRows {
  const exercise = { id, ...newExercise({ esercizio: `Exercise ${id}` }) };
  return { entry: { exercise, sets: [], previous: [], replaces }, rows };
}

describe('splitSections', () => {
  it('keeps the plan order to do and the closing order for the finished ones', () => {
    const exercises = [item(1), item(2), item(3), item(4)];

    const { toDo, closed } = splitSections(exercises, [
      { exerciseId: 3, outcome: 'completed' },
      { exerciseId: 1, outcome: 'completed' },
      { exerciseId: 99, outcome: 'completed' },
    ]);

    expect(toDo.map(({ entry }) => entry.exercise.id)).toEqual([2, 4]);
    expect(closed.map(({ entry, outcome }) => [entry.exercise.id, outcome])).toEqual([
      [3, 'completed'],
      [1, 'completed'],
    ]);
  });
});

describe('splitSections with exercises added during the workout', () => {
  it('places each one right after the exercise it replaces', () => {
    const exercises = [item(1), item(2), item(3, [], 1), item(4, [], 3), item(5, [], 99)];

    const { toDo, closed } = splitSections(exercises, [{ exerciseId: 1, outcome: 'skipped' }]);

    expect(toDo.map(({ entry, replaces }) => [entry.exercise.id, replaces])).toEqual([
      [3, 'Exercise 1'],
      [4, 'Exercise 3'],
      [2, undefined],
      [5, undefined],
    ]);
    expect(closed.map(({ replacedBy }) => replacedBy)).toEqual([['Exercise 3']]);
  });
});

describe('allSetsDone', () => {
  it('needs at least one set, every one ticked', () => {
    expect(allSetsDone([])).toBe(false);
    expect(allSetsDone([row(1, 60, 10), row(2, 60)])).toBe(false);
    expect(allSetsDone([row(1, 60, 10), row(2, 60, 11)])).toBe(true);
  });
});

describe('recordedSummary', () => {
  it('counts the recorded sets and shows their load range in the UI language', () => {
    const pyramid = [row(1, 60, 1), row(2, 62.5, 2), row(3, 70, 3), row(4, 80)];

    expect(recordedSummary(pyramid, 'it')).toEqual({ sets: 3, kg: '60–70' });
    expect(recordedSummary(pyramid.slice(1, 2), 'it')).toEqual({ sets: 1, kg: '62,5' });
    expect(recordedSummary(pyramid.slice(1, 2), 'en')).toEqual({ sets: 1, kg: '62.5' });
  });

  it('has no load when nothing was recorded', () => {
    expect(recordedSummary([row(1, 60)], 'it')).toEqual({ sets: 0, kg: null });
  });
});
