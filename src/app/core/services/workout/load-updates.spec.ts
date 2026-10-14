import { Exercise, WorkoutExercise } from '../../models';
import { newExercise, newSetLog } from '../../testing/fixtures';
import { proposeLoadUpdates } from './load-updates';

function trained(id: number, ultimoKg: number | null, kgs: number[]): WorkoutExercise {
  const exercise: Exercise = { id, ...newExercise({ esercizio: `Esercizio ${id}`, ultimoKg }) };
  return {
    exercise,
    sets: kgs.map((kg, index) => ({ id: index + 1, ...newSetLog({ setNo: index + 1, kg }) })),
    previous: [],
  };
}

describe('proposeLoadUpdates', () => {
  it('proposes the heaviest set when it differs from the plan', () => {
    const proposals = proposeLoadUpdates([trained(1, 60, [60, 65, 70])]);
    expect(
      proposals.map(({ exercise, current, proposed }) => [exercise.id, current, proposed]),
    ).toEqual([[1, 60, 70]]);
  });

  it('proposes lower loads too: the plan should match what was really used', () => {
    expect(proposeLoadUpdates([trained(1, 60, [55, 55])])[0].proposed).toBe(55);
  });

  it('fills the load of an exercise that was still to be tested', () => {
    expect(proposeLoadUpdates([trained(1, null, [40])])[0]).toMatchObject({
      current: null,
      proposed: 40,
    });
  });

  it('skips exercises matching the plan, not trained, or bodyweight without a load', () => {
    expect(
      proposeLoadUpdates([trained(1, 60, [60, 60]), trained(2, 80, []), trained(3, null, [0])]),
    ).toEqual([]);
  });
});
