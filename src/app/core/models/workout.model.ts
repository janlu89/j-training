import { Exercise } from './exercise.model';
import { Phase } from './phase.model';
import { Session } from './session.model';
import { SetLog } from './set-log.model';
import { TrainingDay } from './training-day.model';

/** What the user enters for one set. */
export interface SetValues {
  kg: number;
  rip: number;
}

/** A set filled in on the workout page: which exercise, which set and its values. */
export interface SetEntry {
  exercise: Exercise;
  setNo: number;
  values: SetValues;
}

/** An exercise on its workout page, with what was done today and last time. */
export interface WorkoutExercise {
  exercise: Exercise;
  /** Sets recorded in the open session of this day, by set number. */
  sets: SetLog[];
  /** Sets of the most recent other session with the same exercise name, by set number. */
  previous: SetLog[];
  /** Only for an exercise added during the workout: the id of the one it replaces. */
  replaces?: number;
}

/** The open session (draft) with its training day. */
export interface OpenSession {
  session: Session;
  day: TrainingDay;
}

/** A training day as shown on its workout page. */
export interface WorkoutDay {
  phase: Phase;
  day: TrainingDay;
  exercises: WorkoutExercise[];
  /** The open session of this day, if a set was already recorded. */
  session?: Session;
  /** A draft on another day: only one workout can be in progress at a time. */
  otherOpenSession?: OpenSession;
}

/** A load the user chose to copy into the plan when saving the day. */
export interface LoadUpdate {
  exerciseId: number;
  ultimoKg: number;
}
