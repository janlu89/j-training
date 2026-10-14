import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { ButtonDirective, ButtonIcon, ButtonLabel } from 'primeng/button';
import { Message } from 'primeng/message';
import { BackupStatusService } from '../../../core/services/backup/backup-status.service';
import { BackupService } from '../../../core/services/backup/backup.service';
import { CLOCK } from '../../../core/services/clock';
import { LanguageService } from '../../../core/services/language.service';
import { DaysAgoPipe } from '../../../shared/pipes/days-ago.pipe';

/**
 * A gentle backup reminder: shown only when workouts wait for a backup since a week, with the
 * export one tap away, and "later" postponing it by another week.
 */
@Component({
  selector: 'app-backup-reminder',
  imports: [TranslocoPipe, ButtonDirective, ButtonIcon, ButtonLabel, Message, DaysAgoPipe],
  templateUrl: './backup-reminder.html',
  styleUrl: './backup-reminder.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BackupReminder {
  private readonly backups = inject(BackupService);
  private readonly status = inject(BackupStatusService);

  protected readonly due = this.status.reminderDue;
  protected readonly lastBackupAt = this.status.lastBackupAt;
  protected readonly language = inject(LanguageService).current;
  protected readonly now = inject(CLOCK)();
  protected readonly busy = signal(false);
  protected readonly savedFile = signal<string | null>(null);
  protected readonly failed = signal(false);

  protected async export(): Promise<void> {
    this.failed.set(false);
    this.busy.set(true);
    try {
      this.savedFile.set(await this.backups.exportToFile());
    } catch {
      this.failed.set(true);
    } finally {
      this.busy.set(false);
    }
  }

  protected snooze(): Promise<void> {
    return this.status.snoozeReminder();
  }
}
