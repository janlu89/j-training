import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Exercise, LoadUpdate, OpenSession, SetValues, WorkoutDay } from '../models';
import { WorkoutSessionRepository } from '../repositories/workout-session.repository';
import { CLOCK } from './clock';

/**
 * Use cases of a workout day: record sets as they are done (or all at the end), then save or skip
 * the day. Stamps the time and copies exercise name, phase and load unit into each set, so the
 * history stays readable even after the plan changes.
 */
@Injectable({ providedIn: 'root' })
export class WorkoutSessionService {
  private readonly workouts = inject(WorkoutSessionRepository);
  private readonly clock = inject(CLOCK);

  watchDay(dayId: number): Observable<WorkoutDay | undefined> {
    return this.workouts.watchDay(dayId);
  }

  watchOpenSession(): Observable<OpenSession | undefined> {
    return this.workouts.watchOpenSession();
  }

  recordSet(
    workout: WorkoutDay,
    exercise: Exercise,
    setNo: number,
    values: SetValues,
  ): Promise<number> {
    return this.workouts.recordSet(workout.day, {
      exerciseId: exercise.id,
      esercizio: exercise.esercizio,
      fase: workout.phase.fase,
      date: this.clock(),
      setNo,
      kg: values.kg,
      rip: values.rip,
      unitaCarico: exercise.unitaCarico,
    });
  }

  updateSet(setLogId: number, values: SetValues): Promise<void> {
    return this.workouts.updateSet(setLogId, values);
  }

  removeSet(setLogId: number): Promise<void> {
    return this.workouts.removeSet(setLogId);
  }

  /** Saves the day: the draft becomes a completed session and the chosen loads go to the plan. */
  async completeDay(workout: WorkoutDay, loads: readonly LoadUpdate[]): Promise<void> {
    if (!workout.session) {
      throw new Error(`Training day ${workout.day.id} has no recorded sets`);
    }
    await this.workouts.completeSession(workout.session.id, this.clock(), loads);
  }

  async skipDay(workout: WorkoutDay): Promise<void> {
    await this.workouts.skipDay(workout.day, this.clock());
  }

  discardDraft(sessionId: number): Promise<void> {
    return this.workouts.discardSession(sessionId);
  }
}
