import {
  BACKUP_SCHEMA_VERSION,
  BACKUP_TABLES,
  BackupData,
  BackupFile,
  BackupReadResult,
  BackupTable,
} from '../../models';
import { findIntegrityIssue } from './backup-integrity';
import { readDay, readExercise, readPhase, readSession, readSetLog } from './backup-records';
import { BackupFormatError, RecordReader, isPlainObject } from './record-reader';

/**
 * Parses and validates a backup file. Pure: no I/O, no Angular. A file is accepted only when
 * every record is well formed and the relations the app relies on hold, so a restore can never
 * leave the database in a state the app could not have produced.
 */
export function parseBackup(text: string): BackupReadResult {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, issue: { code: 'notJson' } };
  }
  try {
    const backup = readBackup(json);
    const issue = findIntegrityIssue(backup);
    return issue ? { ok: false, issue } : { ok: true, backup };
  } catch (error) {
    if (error instanceof BackupFormatError) {
      return { ok: false, issue: error.issue };
    }
    throw error;
  }
}

function readBackup(json: unknown): BackupFile {
  if (!isPlainObject(json) || !hasTables(json) || !isDate(json['exportedAt'])) {
    throw new BackupFormatError({ code: 'notBackup' });
  }
  const version = json['schemaVersion'];
  if (typeof version === 'number' && version > BACKUP_SCHEMA_VERSION) {
    throw new BackupFormatError({ code: 'newerVersion' });
  }
  if (version !== BACKUP_SCHEMA_VERSION) {
    throw new BackupFormatError({ code: 'notBackup' });
  }
  return {
    schemaVersion: version,
    exportedAt: json['exportedAt'],
    phases: readTable(json, 'phases', readPhase),
    days: readTable(json, 'days', readDay),
    exercises: readTable(json, 'exercises', readExercise),
    sessions: readTable(json, 'sessions', readSession),
    setLogs: readTable(json, 'setLogs', readSetLog),
  };
}

function hasTables(json: Record<string, unknown>): boolean {
  return BACKUP_TABLES.every((table) => Array.isArray(json[table]));
}

function isDate(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

function readTable<T extends BackupTable>(
  json: Record<string, unknown>,
  table: T,
  read: (reader: RecordReader) => BackupData[T][number],
): BackupData[T] {
  return (json[table] as unknown[]).map((record, index) => {
    const path = `${table}[${index}]`;
    if (!isPlainObject(record)) {
      throw new BackupFormatError({ code: 'invalidRecord', path });
    }
    return read(new RecordReader(record, path));
  }) as BackupData[T];
}
