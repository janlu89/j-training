import { EpochMs } from './entity.model';
import { Exercise } from './exercise.model';
import { Phase } from './phase.model';
import { Session } from './session.model';
import { SetLog } from './set-log.model';
import { TrainingDay } from './training-day.model';

/** Every training record, ids included: what a backup saves and a restore writes back. */
export interface BackupData {
  phases: Phase[];
  days: TrainingDay[];
  exercises: Exercise[];
  sessions: Session[];
  setLogs: SetLog[];
}

export type BackupTable = keyof BackupData;

/** In dependency order: a table only refers to the tables before it. */
export const BACKUP_TABLES: readonly BackupTable[] = [
  'phases',
  'days',
  'exercises',
  'sessions',
  'setLogs',
];

/**
 * Version of the backup format. Raise it, with a migration of older files, whenever the shape of
 * a stored record changes; files from a newer app version are refused instead of being guessed.
 */
export const BACKUP_SCHEMA_VERSION = 1;

/** The backup file. Device preferences (language, rest between exercises) are not included. */
export interface BackupFile extends BackupData {
  schemaVersion: number;
  /** ISO 8601: readable when the file is opened by hand. */
  exportedAt: string;
}

export type BackupIssueCode =
  | 'fileTooLarge'
  | 'notJson'
  | 'notBackup'
  | 'newerVersion'
  | 'invalidRecord'
  | 'duplicateId'
  | 'brokenReference'
  | 'multipleActivePlans'
  | 'multipleOpenSessions';

/** Why a file cannot be restored. `path` points at the offending value, e.g. `setLogs[12].kg`. */
export interface BackupIssue {
  code: BackupIssueCode;
  path?: string;
}

export type BackupReadResult = { ok: true; backup: BackupFile } | { ok: false; issue: BackupIssue };

/** What a backup contains, shown before it replaces the data of the device. */
export interface BackupSummary {
  exportedAt: EpochMs;
  plans: number;
  sessions: number;
  sets: number;
}
