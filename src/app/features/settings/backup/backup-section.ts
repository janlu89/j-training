import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { ConfirmationService } from 'primeng/api';
import { ButtonDirective, ButtonIcon, ButtonLabel } from 'primeng/button';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { Message } from 'primeng/message';
import { BackupFile, BackupIssue } from '../../../core/models';
import { AppRestartService } from '../../../core/services/app-restart.service';
import { BackupService, summarizeBackup } from '../../../core/services/backup/backup.service';
import { LanguageService } from '../../../core/services/language.service';
import { formatLocalDate } from '../../../shared/pipes/local-date.pipe';
import { SettingsSection } from '../../../shared/ui/settings-section/settings-section';

/** Where the app restarts after a restore: the settings page, showing that it worked. */
export const RESTORED_URL = '/settings?restored=1';

/** Export of all the training data to a file and restore from one, after a confirmation. */
@Component({
  selector: 'app-backup-section',
  imports: [
    TranslocoPipe,
    ButtonDirective,
    ButtonIcon,
    ButtonLabel,
    ConfirmDialog,
    Message,
    SettingsSection,
  ],
  providers: [ConfirmationService],
  templateUrl: './backup-section.html',
  styleUrl: './backup-section.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BackupSection {
  private readonly backups = inject(BackupService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly transloco = inject(TranslocoService);
  private readonly language = inject(LanguageService).current;
  private readonly restart = inject(AppRestartService);

  /** True right after the app restarted on restored data. */
  readonly restored = input(false);

  protected readonly busy = signal(false);
  protected readonly exportedFile = signal<string | null>(null);
  protected readonly issue = signal<BackupIssue | null>(null);
  protected readonly restoreFailed = signal(false);

  protected async export(): Promise<void> {
    this.clearMessages();
    this.busy.set(true);
    try {
      this.exportedFile.set(await this.backups.exportToFile());
    } finally {
      this.busy.set(false);
    }
  }

  protected async onFileSelected(input: HTMLInputElement): Promise<void> {
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }
    this.clearMessages();
    this.busy.set(true);
    try {
      const result = await this.backups.read(file);
      if (result.ok) {
        this.confirmRestore(result.backup);
      } else {
        this.issue.set(result.issue);
      }
    } finally {
      this.busy.set(false);
    }
  }

  private confirmRestore(backup: BackupFile): void {
    const { exportedAt, ...counts } = summarizeBackup(backup);
    const t = (key: string, params?: Record<string, unknown>) =>
      this.transloco.translate(`backup.confirm.${key}`, params);
    this.confirmation.confirm({
      header: t('title'),
      message: t('message', { ...counts, date: formatLocalDate(exportedAt, this.language()) }),
      acceptLabel: t('accept'),
      rejectLabel: t('cancel'),
      acceptButtonProps: { severity: 'danger' },
      rejectButtonProps: { severity: 'secondary' },
      accept: () => void this.restore(backup),
    });
  }

  private async restore(backup: BackupFile): Promise<void> {
    this.busy.set(true);
    try {
      await this.backups.restore(backup);
      this.restart.restartAt(RESTORED_URL);
    } catch {
      this.restoreFailed.set(true);
      this.busy.set(false);
    }
  }

  private clearMessages(): void {
    this.exportedFile.set(null);
    this.issue.set(null);
    this.restoreFailed.set(false);
  }
}
