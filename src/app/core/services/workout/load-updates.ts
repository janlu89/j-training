import { Exercise } from '../../models';

/** The loads that will be saved today for one exercise. */
export interface ExerciseLoads {
  exercise: Exercise;
  loads: readonly number[];
}

/** A load used today that differs from the plan, offered as the new plan load. */
export interface LoadProposal {
  exercise: Exercise;
  current: number | null;
  proposed: number;
}

/**
 * Exercises whose load today differs from the plan. The heaviest set is proposed, which is the
 * top set of a pyramid. Exercises without sets to save are left alone.
 */
export function proposeLoadUpdates(entries: readonly ExerciseLoads[]): LoadProposal[] {
  return entries.flatMap(({ exercise, loads }) => {
    if (!loads.length) {
      return [];
    }
    const proposed = Math.max(...loads);
    const current = exercise.ultimoKg;
    // Bodyweight work (0 kg) on an exercise without a plan load has nothing to update.
    return proposed === (current ?? 0) ? [] : [{ exercise, current, proposed }];
  });
}
