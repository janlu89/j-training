import { Injectable, inject } from '@angular/core';
import Dexie from 'dexie';
import { AppDatabase } from '../db/app-database';
import { PlanRecords } from '../models';

/** Read side of the plan export: a plan with every saved workout and set, in one transaction. */
@Injectable({ providedIn: 'root' })
export class PlanExportRepository {
  private readonly db = inject(AppDatabase);

  getRecords(phaseId: number): Promise<PlanRecords | undefined> {
    const { db } = this;
    return db.transaction(
      'r',
      [db.phases, db.days, db.exercises, db.sessions, db.setLogs],
      async () => {
        const phase = await db.phases.get(phaseId);
        if (!phase) {
          return undefined;
        }
        const sessions = (
          await db.sessions.where('phaseId').equals(phaseId).sortBy('startedAt')
        ).filter((session) => session.endedAt !== undefined);
        return {
          phase,
          days: await db.days
            .where('[phaseId+ordine]')
            .between([phaseId, Dexie.minKey], [phaseId, Dexie.maxKey])
            .toArray(),
          exercises: await db.exercises.where('phaseId').equals(phaseId).toArray(),
          sessions,
          setLogs: await db.setLogs
            .where('sessionId')
            .anyOf(sessions.map((session) => session.id))
            .toArray(),
        };
      },
    );
  }
}
