import { EpochMs } from './entity.model';
import { LoadUnit } from './exercise.model';
import { Session } from './session.model';
import { SetLog } from './set-log.model';
import { TrainingDay } from './training-day.model';

/** A saved (or skipped) workout in the history list. */
export interface SessionSummary {
  session: Session;
  planName: string;
  /** Undefined when the day was deleted from the plan afterwards. */
  day?: TrainingDay;
  setCount: number;
  exerciseCount: number;
}

/** The sets of one exercise within a session, in set order. */
export interface SessionExercise {
  exerciseId: number;
  esercizio: string;
  unitaCarico: LoadUnit;
  sets: SetLog[];
}

/** A planned exercise left out of a saved workout, with the exercises done in its place. */
export interface SkippedExercise {
  esercizio: string;
  replacedBy: string[];
}

/** A saved workout with every set, exercises in plan order. */
export interface SessionDetail {
  session: Session;
  planName: string;
  day?: TrainingDay;
  exercises: SessionExercise[];
  /** Exercises left out or replaced, in the order they were closed. */
  skipped: SkippedExercise[];
}

/** One exercise name of the history, with how often and how recently it was trained. */
export interface ExerciseSummary {
  esercizio: string;
  sessionCount: number;
  lastDate: EpochMs;
}

/** The sets of an exercise name in one saved session. */
export interface ExerciseSession {
  sessionId: number;
  date: EpochMs;
  fase: number;
  unitaCarico: LoadUnit;
  sets: SetLog[];
}
