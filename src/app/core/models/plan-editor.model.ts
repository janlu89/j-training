import { Exercise } from './exercise.model';
import { TrainingDay } from './training-day.model';

/** Plan fields editable by the user. */
export interface PlanInput {
  name: string;
  fase: number;
}

/** Day fields editable by the user. `csvGiorno` doubles as the day's free name ("Petto e tricipiti"). */
export type DayInput = Pick<TrainingDay, 'csvGiorno' | 'weekday'>;

/** Exercise fields editable in the form; position, plan and origin are managed by the editor. */
export type ExerciseInput = Omit<Exercise, 'id' | 'phaseId' | 'dayId' | 'ordine' | 'isManual'>;

export type MoveDirection = -1 | 1;

/** A plan with recorded sessions is history: it can be archived but not deleted. */
export type DeletePlanResult = 'deleted' | 'hasSessions';
