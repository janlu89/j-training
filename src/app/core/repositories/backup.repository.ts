import { Injectable, inject } from '@angular/core';
import { liveQuery } from 'dexie';
import { Observable, from } from 'rxjs';
import { AppDatabase } from '../db/app-database';
import { BackupData, BackupStatus, SETTINGS_ID } from '../models';

/**
 * The training data as a whole: read for a backup, replaced by a restore, each in a single
 * transaction over every table. Device settings are not part of it; only the backup status reads
 * them, for the date of the last backup.
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

  /** When the data was last backed up and which workouts came after: re-emitted on every change. */
  watchStatus(): Observable<BackupStatus> {
    return from(liveQuery(() => this.getStatus()));
  }

  /** `endedAt` is not indexed: a scan, cheap for the few hundred sessions of a personal log. */
  getStatus(): Promise<BackupStatus> {
    const { db } = this;
    return db.transaction('r', db.settings, db.sessions, async () => {
      const settings = await db.settings.get(SETTINGS_ID);
      const since = settings?.lastBackupAt ?? -Infinity;
      const unsaved = (await db.sessions.toArray()).flatMap(({ endedAt }) =>
        endedAt !== undefined && endedAt > since ? [endedAt] : [],
      );
      return {
        lastBackupAt: settings?.lastBackupAt,
        reminderSnoozedAt: settings?.backupReminderSnoozedAt,
        firstUnsavedAt: unsaved.length ? Math.min(...unsaved) : undefined,
      };
    });
  }

  private tables() {
    const { db } = this;
    return [db.phases, db.days, db.exercises, db.sessions, db.setLogs];
  }
}
