import { Injectable, inject } from '@angular/core';
import Dexie, { liveQuery } from 'dexie';
import { Observable, from } from 'rxjs';
import { AppDatabase } from '../db/app-database';
import { Exercise, NewPlan, Phase, PlanDay, PlanDetail, PlanSummary } from '../models';

/**
 * Aggregate repository for a whole plan (phase + days + exercises). Table repositories handle
 * single records; this one owns the multi-table reads and the transactions that keep the
 * "exactly one active plan" invariant.
 */
@Injectable({ providedIn: 'root' })
export class PlanRepository {
  private readonly db = inject(AppDatabase);

  /** Stores a plan atomically. When `activate` is true the current active plan is archived. */
  savePlan(plan: NewPlan, activate: boolean): Promise<number> {
    const { db } = this;
    return db.transaction('rw', db.phases, db.days, db.exercises, async () => {
      if (activate) {
        await this.archiveActive();
      }
      const phaseId = await db.phases.add({
        name: plan.name,
        fase: plan.fase,
        importedAt: plan.importedAt,
        status: activate ? 'active' : 'archived',
      });
      const dayIds = await this.addDays(plan, phaseId);
      await db.exercises.bulkAdd(
        plan.exercises.map(({ dayKey, ...exercise }) => ({
          ...exercise,
          phaseId,
          dayId: dayIdFor(dayIds, dayKey),
        })),
      );
      return phaseId;
    });
  }

  /** Makes a plan the only active one. */
  activate(phaseId: number): Promise<void> {
    const { db } = this;
    return db.transaction('rw', db.phases, async () => {
      await this.archiveActive();
      await db.phases.update(phaseId, { status: 'active' });
    });
  }

  findByFase(fase: number): Promise<Phase[]> {
    return this.db.phases.where('fase').equals(fase).toArray();
  }

  getPlan(phaseId: number): Promise<PlanDetail | undefined> {
    const { db } = this;
    return db.transaction('r', db.phases, db.days, db.exercises, async () => {
      const phase = await db.phases.get(phaseId);
      return phase ? { phase, days: await this.getDays(phaseId) } : undefined;
    });
  }

  watchPlan(phaseId: number): Observable<PlanDetail | undefined> {
    return from(liveQuery(() => this.getPlan(phaseId)));
  }

  watchActivePlan(): Observable<PlanDetail | undefined> {
    return from(
      liveQuery(async () => {
        const active = await this.db.phases.where('status').equals('active').first();
        return active ? this.getPlan(active.id) : undefined;
      }),
    );
  }

  /** All plans: the active one first, then the most recently imported. */
  watchSummaries(): Observable<PlanSummary[]> {
    return from(liveQuery(() => this.getSummaries()));
  }

  private async getSummaries(): Promise<PlanSummary[]> {
    const { db } = this;
    const phases = await db.phases.toArray();
    const summaries = await Promise.all(
      phases.map(async (phase) => ({
        phase,
        dayCount: await db.days.where('phaseId').equals(phase.id).count(),
        exerciseCount: await db.exercises
          .where('phaseId')
          .equals(phase.id)
          .filter(isVisible)
          .count(),
      })),
    );
    return summaries.sort(
      (a, b) =>
        Number(b.phase.status === 'active') - Number(a.phase.status === 'active') ||
        b.phase.importedAt - a.phase.importedAt,
    );
  }

  private async getDays(phaseId: number): Promise<PlanDay[]> {
    const { db } = this;
    const days = await db.days
      .where('[phaseId+ordine]')
      .between([phaseId, Dexie.minKey], [phaseId, Dexie.maxKey])
      .toArray();
    const exercises = await db.exercises
      .where('phaseId')
      .equals(phaseId)
      .filter(isVisible)
      .toArray();
    return days.map((day) => ({
      day,
      exercises: exercises
        .filter((exercise) => exercise.dayId === day.id)
        .sort((a, b) => a.ordine - b.ordine),
    }));
  }

  private async addDays(plan: NewPlan, phaseId: number): Promise<Map<string, number>> {
    const records = plan.days.map(({ ordine, csvGiorno, weekday }) => ({
      phaseId,
      ordine,
      csvGiorno,
      ...(weekday ? { weekday } : {}),
    }));
    const ids = await this.db.days.bulkAdd(records, { allKeys: true });
    return new Map(plan.days.map((day, index) => [day.key, ids[index]]));
  }

  private async archiveActive(): Promise<void> {
    await this.db.phases.where('status').equals('active').modify({ status: 'archived' });
  }
}

/** Throwing inside the transaction rolls back the whole import. */
function dayIdFor(dayIds: Map<string, number>, dayKey: string): number {
  const dayId = dayIds.get(dayKey);
  if (dayId === undefined) {
    throw new Error(`Exercise refers to unknown day "${dayKey}"`);
  }
  return dayId;
}

/** Soft-deleted exercises (`rimosso`) stay in the database for history but are not shown. */
function isVisible(exercise: Exercise): boolean {
  return exercise.stato !== 'rimosso';
}
