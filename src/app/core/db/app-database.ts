import { Injectable } from '@angular/core';
import Dexie, { EntityTable } from 'dexie';
import { AppSettings, Exercise, Phase, Session, SetLog, TrainingDay } from '../models';
import { DB_NAME, SCHEMA_V1 } from './schema';

/**
 * Single IndexedDB database of the app. Only repositories may inject it:
 * components and features never talk to Dexie directly.
 */
@Injectable({ providedIn: 'root' })
export class AppDatabase extends Dexie {
  phases!: EntityTable<Phase, 'id'>;
  days!: EntityTable<TrainingDay, 'id'>;
  exercises!: EntityTable<Exercise, 'id'>;
  sessions!: EntityTable<Session, 'id'>;
  setLogs!: EntityTable<SetLog, 'id'>;
  settings!: EntityTable<AppSettings, 'id'>;

  constructor() {
    super(DB_NAME);
    this.version(1).stores(SCHEMA_V1);
  }
}
