import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  EpochMs,
  Exercise,
  ExerciseOutcome,
  LoadUpdate,
  OpenSession,
  SetEntry,
  SetValues,
  WorkoutDay,
} from '../models';
import { ExerciseRepository } from '../repositories/exercise.repository';
import { NewSet, WorkoutSessionRepository } from '../repositories/workout-session.repository';
import { CLOCK } from './clock';

/**
 * Use cases of a workout day: record sets as they are done, or fill everything in at the end, then
 * save or skip the day. Stamps the time and copies exercise name, phase and load unit into each
 * set, so the history stays readable even after the plan changes.
 */
@Injectable({ providedIn: 'root' })
export class WorkoutSessionService {
  private readonly workouts = inject(WorkoutSessionRepository);
  private readonly exercises = inject(ExerciseRepository);
  private readonly clock = inject(CLOCK);

  watchDay(dayId: number): Observable<WorkoutDay | undefined> {
    return this.workouts.watchDay(dayId);
  }

  watchOpenSession(): Observable<OpenSession | undefined> {
    return this.workouts.watchOpenSession();
  }

  recordSet(workout: WorkoutDay, entry: SetEntry): Promise<number> {
    return this.workouts.recordSet(workout.day, toNewSet(workout, entry, this.clock()));
  }

  updateSet(setLogId: number, values: SetValues): Promise<void> {
    return this.workouts.updateSet(setLogId, values);
  }

  removeSet(setLogId: number): Promise<void> {
    return this.workouts.removeSet(setLogId);
  }

  /** Moves an exercise to the finished ones at the bottom of the page. */
  closeExercise(workout: WorkoutDay, exerciseId: number, outcome: ExerciseOutcome): Promise<void> {
    return this.workouts.closeExercise(workout.day, { exerciseId, outcome }, this.clock());
  }

  /** Every exercise of every plan, one per name: what can be done in place of another. */
  watchSubstituteChoices(): Observable<Exercise[]> {
    return this.exercises.watchChoices();
  }

  /** Does another exercise in place of one of the workout, for today only. */
  replaceExercise(workout: WorkoutDay, exerciseId: number, substituteId: number): Promise<void> {
    return this.workouts.replaceExercise(
      workout.day,
      { exerciseId: substituteId, replaces: exerciseId },
      this.clock(),
    );
  }

  /** Takes an added exercise without sets out of the workout. */
  removeSubstitute(workout: WorkoutDay, exerciseId: number): Promise<void> {
    return this.workouts.removeSubstitute(workout.day, exerciseId);
  }

  /** Brings a finished exercise back to its place among those to do. */
  reopenExercise(workout: WorkoutDay, exerciseId: number): Promise<void> {
    return this.workouts.reopenExercise(workout.day, exerciseId);
  }

  /**
   * Saves the day as completed: the ticked sets, plus `unticked` ones the user chose to keep
   * (filled in at the end of the workout), and the chosen loads copied into the plan.
   */
  async saveDay(
    workout: WorkoutDay,
    unticked: readonly SetEntry[],
    loads: readonly LoadUpdate[],
  ): Promise<void> {
    const now = this.clock();
    const sets = unticked.map((entry) => toNewSet(workout, entry, now));
    await this.workouts.saveDay(workout.day, sets, now, loads);
  }

  async skipDay(workout: WorkoutDay): Promise<void> {
    await this.workouts.skipDay(workout.day, this.clock());
  }

  discardDraft(sessionId: number): Promise<void> {
    return this.workouts.discardSession(sessionId);
  }
}

function toNewSet(
  workout: WorkoutDay,
  { exercise, setNo, values }: SetEntry,
  date: EpochMs,
): NewSet {
  return {
    exerciseId: exercise.id,
    esercizio: exercise.esercizio,
    fase: workout.phase.fase,
    date,
    setNo,
    kg: values.kg,
    rip: values.rip,
    unitaCarico: exercise.unitaCarico,
  };
}
