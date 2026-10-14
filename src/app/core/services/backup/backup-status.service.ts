import { Injectable, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AppLanguage, EpochMs } from '../../models';
import { BackupRepository } from '../../repositories/backup.repository';
import { SettingsRepository } from '../../repositories/settings.repository';
import { CLOCK } from '../clock';
import { LanguageService } from '../language.service';
import { isBackupReminderDue } from './backup-reminder';

/** When the data was last backed up, and whether it is time to remind the user. */
@Injectable({ providedIn: 'root' })
export class BackupStatusService {
  private readonly settings = inject(SettingsRepository);
  private readonly language = inject(LanguageService);
  private readonly now = inject(CLOCK);
  private readonly status = toSignal(inject(BackupRepository).watchStatus());

  /** Undefined while loading and on a device never backed up. */
  readonly lastBackupAt = computed(() => this.status()?.lastBackupAt);

  /** Evaluated whenever the data or the preferences change, e.g. when a page with it opens. */
  readonly reminderDue = computed(() => {
    const status = this.status();
    return status !== undefined && isBackupReminderDue(status, this.now());
  });

  async markBackedUp(at: EpochMs): Promise<void> {
    await this.settings.merge({ lastBackupAt: at }, this.currentLanguage());
  }

  /** "Later": the reminder comes back in a week if there is still something to save. */
  async snoozeReminder(): Promise<void> {
    await this.settings.merge({ backupReminderSnoozedAt: this.now() }, this.currentLanguage());
  }

  private currentLanguage(): AppLanguage {
    return this.language.current() as AppLanguage;
  }
}
