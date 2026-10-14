import { Injectable, inject } from '@angular/core';
import {
  BACKUP_SCHEMA_VERSION,
  BackupData,
  BackupFile,
  BackupReadResult,
  BackupSummary,
} from '../../models';
import { BackupRepository } from '../../repositories/backup.repository';
import { CLOCK } from '../clock';
import { FileDownloadService } from '../file-download.service';
import { isoLocalDate } from '../iso-date';
import { parseBackup } from './backup-parser';

/** Years of workouts are a few MB: anything much larger is not a J-Training backup. */
export const MAX_BACKUP_FILE_BYTES = 50 * 1024 * 1024;

/** Full backup of the training data to a JSON file, and restore from one. */
@Injectable({ providedIn: 'root' })
export class BackupService {
  private readonly backups = inject(BackupRepository);
  private readonly download = inject(FileDownloadService);
  private readonly now = inject(CLOCK);

  async createBackup(): Promise<BackupFile> {
    const data = await this.backups.readAll();
    return {
      schemaVersion: BACKUP_SCHEMA_VERSION,
      exportedAt: new Date(this.now()).toISOString(),
      ...data,
    };
  }

  /** Saves a backup to the device and returns the name of the file. */
  async exportToFile(): Promise<string> {
    const backup = await this.createBackup();
    const fileName = `j-training-backup-${isoLocalDate(Date.parse(backup.exportedAt))}.json`;
    const json = JSON.stringify(backup, null, 2);
    this.download.save(new Blob([json], { type: 'application/json' }), fileName);
    return fileName;
  }

  async read(file: File): Promise<BackupReadResult> {
    if (file.size > MAX_BACKUP_FILE_BYTES) {
      return { ok: false, issue: { code: 'fileTooLarge' } };
    }
    return parseBackup(await file.text());
  }

  /** Replaces all the training data of the device with the backup, in one transaction. */
  restore(backup: BackupData): Promise<void> {
    return this.backups.replaceAll(backup);
  }
}

export function summarizeBackup(backup: BackupFile): BackupSummary {
  return {
    exportedAt: Date.parse(backup.exportedAt),
    plans: backup.phases.length,
    sessions: backup.sessions.length,
    sets: backup.setLogs.length,
  };
}
