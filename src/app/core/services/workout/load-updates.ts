import { Exercise, WorkoutExercise } from '../../models';

/** A load used today that differs from the plan, offered as the new plan load. */
export interface LoadProposal {
  exercise: Exercise;
  current: number | null;
  proposed: number;
}

/**
 * Exercises whose load today differs from the plan. The heaviest recorded set is proposed, which
 * is the top set of a pyramid. Exercises without recorded sets are left alone.
 */
export function proposeLoadUpdates(exercises: readonly WorkoutExercise[]): LoadProposal[] {
  return exercises.flatMap(({ exercise, sets }) => {
    if (!sets.length) {
      return [];
    }
    const proposed = Math.max(...sets.map((set) => set.kg));
    const current = exercise.ultimoKg;
    // Bodyweight work (0 kg) on an exercise without a plan load has nothing to update.
    return proposed === (current ?? 0) ? [] : [{ exercise, current, proposed }];
  });
}
