import { Entity, EpochMs } from './entity.model';

/** How a finished session ended. Both outcomes move the rotation to the next day. */
export type SessionOutcome = 'completed' | 'skipped';

export const SESSION_OUTCOMES: readonly SessionOutcome[] = ['completed', 'skipped'];

/** How an exercise was closed during a workout: done, or left out (also when replaced). */
export type ExerciseOutcome = 'completed' | 'skipped';

export const EXERCISE_OUTCOMES: readonly ExerciseOutcome[] = ['completed', 'skipped'];

/** An exercise moved to the finished ones at the bottom of the workout page. */
export interface ClosedExercise {
  exerciseId: number;
  outcome: ExerciseOutcome;
}

/** An exercise done in one workout in place of another; the plan does not change. */
export interface ExerciseSubstitute {
  /** The exercise done instead: any exercise of any plan. */
  exerciseId: number;
  /** The exercise of the workout it replaces. */
  replaces: number;
}

/**
 * A workout session on a training day. While `endedAt` is undefined the session is a draft:
 * every recorded set is already stored, so closing the app loses nothing.
 */
export interface Session extends Entity {
  phaseId: number;
  dayId: number;
  startedAt: EpochMs;
  endedAt?: EpochMs;
  /** Not indexed: added in F4 without a new schema version. Undefined while the session is open. */
  outcome?: SessionOutcome;
  /** Exercises finished during the workout, in the order they were closed. Not indexed. */
  closedExercises?: ClosedExercise[];
  /** Exercises added during the workout in place of others, in the order added. Not indexed. */
  substitutes?: ExerciseSubstitute[];
}
