import { EpochMs } from './entity.model';
import { Exercise } from './exercise.model';
import { Phase } from './phase.model';
import { TrainingDay } from './training-day.model';

/** A day of a plan with its visible exercises in plan order. */
export interface PlanDay {
  day: TrainingDay;
  exercises: Exercise[];
}

/** A whole plan, as shown by the workout and plan detail pages. */
export interface PlanDetail {
  phase: Phase;
  days: PlanDay[];
}

/** One row of the plans archive. */
export interface PlanSummary {
  phase: Phase;
  dayCount: number;
  exerciseCount: number;
}

/** A plan ready to be stored: days and exercises are linked by `dayKey` until ids exist. */
export interface NewPlan {
  name: string;
  fase: number;
  importedAt: EpochMs;
  days: NewPlanDay[];
  exercises: NewPlanExercise[];
}

export type NewPlanDay = Omit<TrainingDay, 'id' | 'phaseId'> & { key: string };

export type NewPlanExercise = Omit<Exercise, 'id' | 'phaseId' | 'dayId'> & { dayKey: string };
