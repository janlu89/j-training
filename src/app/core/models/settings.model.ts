import { Entity, EpochMs } from './entity.model';

export type AppLanguage = 'it' | 'en';

/** Device preferences. A single record (`SETTINGS_ID`), not part of the data backup. */
export interface AppSettings extends Entity {
  language: AppLanguage;
  /** Rest before the next exercise; the default applies while it is not set. */
  exerciseRestSeconds?: number;
  /** When the data of this device was last saved to a backup file (or restored from one). */
  lastBackupAt?: EpochMs;
  /** When the user last answered "later" to the backup reminder. */
  backupReminderSnoozedAt?: EpochMs;
}

export const SETTINGS_ID = 1;
