import { Injectable, inject } from '@angular/core';
import { AppDatabase } from '../db/app-database';
import { BackupData } from '../models';

/**
 * The training data as a whole: read for a backup, replaced by a restore. Device settings are
 * not part of it. Both operations run in a single transaction over every table.
 */
@Injectable({ providedIn: 'root' })
export class BackupRepository {
  private readonly db = inject(AppDatabase);

  /** A consistent snapshot: a workout saved meanwhile is either fully in it or not at all. */
  readAll(): Promise<BackupData> {
    const { db } = this;
    return db.transaction('r', this.tables(), async () => ({
      phases: await db.phases.toArray(),
      days: await db.days.toArray(),
      exercises: await db.exercises.toArray(),
      sessions: await db.sessions.toArray(),
      setLogs: await db.setLogs.toArray(),
    }));
  }

  /**
   * Replaces every record, keeping the original ids so that all links stay valid. If any write
   * fails the transaction is rolled back and the current data is untouched. Later inserts continue
   * after the highest restored id: IndexedDB advances the key generator past explicit keys.
   */
  replaceAll(data: BackupData): Promise<void> {
    const { db } = this;
    return db.transaction('rw', this.tables(), async () => {
      await Promise.all(this.tables().map((table) => table.clear()));
      await db.phases.bulkAdd(data.phases);
      await db.days.bulkAdd(data.days);
      await db.exercises.bulkAdd(data.exercises);
      await db.sessions.bulkAdd(data.sessions);
      await db.setLogs.bulkAdd(data.setLogs);
    });
  }

  private tables() {
    const { db } = this;
    return [db.phases, db.days, db.exercises, db.sessions, db.setLogs];
  }
}
