import { Injectable, inject } from '@angular/core';
import { AppDatabase } from '../db/app-database';
import {
  DayInput,
  DeletePlanResult,
  ExerciseInput,
  MoveDirection,
  PlanInput,
  TrainingDay,
} from '../models';

/**
 * Write side of the plan editor: plans, days and exercises created or changed by hand.
 * Every multi-record change runs in a transaction, so an interrupted edit leaves no half state.
 */
@Injectable({ providedIn: 'root' })
export class PlanEditorRepository {
  private readonly db = inject(AppDatabase);

  /** Creates an empty plan. When `activate` is true the current active plan is archived. */
  createPlan(plan: PlanInput, activate: boolean): Promise<number> {
    const { db } = this;
    return db.transaction('rw', db.phases, async () => {
      if (activate) {
        await db.phases.where('status').equals('active').modify({ status: 'archived' });
      }
      return db.phases.add({
        ...plan,
        importedAt: Date.now(),
        status: activate ? 'active' : 'archived',
      });
    });
  }

  async updatePlan(phaseId: number, plan: PlanInput): Promise<void> {
    await this.db.phases.update(phaseId, { ...plan });
  }

  /** Deletes a plan with its days and exercises, unless workouts were recorded on it. */
  deletePlan(phaseId: number): Promise<DeletePlanResult> {
    const { db } = this;
    return db.transaction('rw', db.phases, db.days, db.exercises, db.sessions, async () => {
      if ((await db.sessions.where('phaseId').equals(phaseId).count()) > 0) {
        return 'hasSessions';
      }
      await db.exercises.where('phaseId').equals(phaseId).delete();
      await db.days.where('phaseId').equals(phaseId).delete();
      await db.phases.delete(phaseId);
      return 'deleted';
    });
  }

  /** Appends a day at the end of the plan. */
  addDay(phaseId: number, day: DayInput): Promise<number> {
    const { db } = this;
    return db.transaction('rw', db.days, async () => {
      const days = await db.days.where('phaseId').equals(phaseId).toArray();
      return db.days.add({ ...day, phaseId, ordine: nextOrdine(days) });
    });
  }

  async updateDay(dayId: number, day: DayInput): Promise<void> {
    await this.db.days.update(dayId, { csvGiorno: day.csvGiorno, weekday: day.weekday });
  }

  /** Swaps a day with its neighbour in the plan order. */
  moveDay(dayId: number, direction: MoveDirection): Promise<void> {
    const { db } = this;
    return db.transaction('rw', db.days, async () => {
      const day = await db.days.get(dayId);
      if (!day) {
        return;
      }
      const days = await db.days.where('phaseId').equals(day.phaseId).toArray();
      for (const change of reorder(days, dayId, direction)) {
        await db.days.update(change.id, { ordine: change.ordine });
      }
    });
  }

  /**
   * Deletes a day and its exercises. Recorded sets keep exercise name and phase, so the
   * history by exercise name is not affected; a workout in progress on the day is closed as
   * completed, so its sets are kept instead of being left in a draft that cannot be reopened.
   */
  deleteDay(dayId: number): Promise<void> {
    const { db } = this;
    return db.transaction('rw', db.days, db.exercises, db.sessions, async () => {
      await db.sessions
        .where('dayId')
        .equals(dayId)
        .filter((session) => session.endedAt === undefined)
        .modify({ endedAt: Date.now(), outcome: 'completed' });
      await db.exercises.where('dayId').equals(dayId).delete();
      await db.days.delete(dayId);
    });
  }

  /** Appends a manually created exercise at the end of a day. */
  addExercise(dayId: number, exercise: ExerciseInput): Promise<number> {
    const { db } = this;
    return db.transaction('rw', db.days, db.exercises, async () => {
      const day = await this.requireDay(dayId);
      const siblings = await db.exercises.where('dayId').equals(dayId).toArray();
      return db.exercises.add({
        ...exercise,
        phaseId: day.phaseId,
        dayId,
        ordine: nextOrdine(siblings),
        isManual: true,
      });
    });
  }

  /** Updates an exercise; a new `dayId` moves it to the end of that day. */
  updateExercise(exerciseId: number, exercise: ExerciseInput, dayId: number): Promise<void> {
    const { db } = this;
    return db.transaction('rw', db.days, db.exercises, async () => {
      const current = await db.exercises.get(exerciseId);
      if (!current) {
        return;
      }
      const moved = current.dayId !== dayId;
      if (moved) {
        await this.requireDay(dayId);
      }
      const ordine = moved
        ? nextOrdine(await db.exercises.where('dayId').equals(dayId).toArray())
        : current.ordine;
      await db.exercises.update(exerciseId, { ...exercise, dayId, ordine });
    });
  }

  /** Swaps an exercise with its visible neighbour in the day. */
  moveExercise(exerciseId: number, direction: MoveDirection): Promise<void> {
    const { db } = this;
    return db.transaction('rw', db.exercises, async () => {
      const exercise = await db.exercises.get(exerciseId);
      if (!exercise) {
        return;
      }
      const visible = await db.exercises
        .where('dayId')
        .equals(exercise.dayId)
        .filter((item) => item.stato !== 'rimosso')
        .toArray();
      for (const change of reorder(visible, exerciseId, direction)) {
        await db.exercises.update(change.id, { ordine: change.ordine });
      }
    });
  }

  /** Soft delete: hidden from the plan, kept for history. */
  async removeExercise(exerciseId: number): Promise<void> {
    await this.db.exercises.update(exerciseId, { stato: 'rimosso' });
  }

  private async requireDay(dayId: number): Promise<TrainingDay> {
    const day = await this.db.days.get(dayId);
    if (!day) {
      throw new Error(`Training day ${dayId} does not exist`);
    }
    return day;
  }
}

interface Ordered {
  id: number;
  ordine: number;
}

function nextOrdine(items: readonly Ordered[]): number {
  return items.reduce((max, item) => Math.max(max, item.ordine), 0) + 1;
}

/**
 * Moves an item one place up or down and renumbers the sequence 1..n, returning only the records
 * whose position changes. Renumbering keeps it correct even when imported rows share an `ordine`.
 */
export function reorder(
  items: readonly Ordered[],
  id: number,
  direction: MoveDirection,
): Ordered[] {
  const sorted = [...items].sort((a, b) => a.ordine - b.ordine || a.id - b.id);
  const index = sorted.findIndex((item) => item.id === id);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= sorted.length) {
    return [];
  }
  [sorted[index], sorted[target]] = [sorted[target], sorted[index]];
  return sorted
    .map((item, position) => ({
      id: item.id,
      ordine: position + 1,
      changed: item.ordine !== position + 1,
    }))
    .filter((item) => item.changed)
    .map(({ id: changedId, ordine }) => ({ id: changedId, ordine }));
}
