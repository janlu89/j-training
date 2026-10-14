import { Exercise } from './exercise.model';
import { Phase } from './phase.model';
import { Session } from './session.model';
import { SetLog } from './set-log.model';
import { TrainingDay } from './training-day.model';

export type PlanExportFormat = 'csv' | 'xlsx';

/** Everything recorded for one plan, as read for an export. */
export interface PlanRecords {
  phase: Phase;
  /** In plan order. */
  days: TrainingDay[];
  /** Removed exercises included: their sets are still part of the plan's history. */
  exercises: Exercise[];
  /** Saved and skipped workouts, oldest first; a workout still in progress is not exported. */
  sessions: Session[];
  setLogs: SetLog[];
}

/** A planned exercise with its day. */
export interface PlanRow {
  day: TrainingDay;
  exercise: Exercise;
}

/** A performed set with its workout and, while they still exist, its day and planned exercise. */
export interface SetRow {
  session: Session;
  set: SetLog;
  day?: TrainingDay;
  exercise?: Exercise;
}

/** One line of the flat export: a planned exercise, a performed set, or both. */
export interface PlanSetRow {
  day?: TrainingDay;
  exercise?: Exercise;
  session?: Session;
  set?: SetLog;
}
