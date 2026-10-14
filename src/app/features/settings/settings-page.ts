import {
  ChangeDetectionStrategy,
  Component,
  booleanAttribute,
  computed,
  inject,
  input,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { SelectButton } from 'primeng/selectbutton';
import { Tag } from 'primeng/tag';
import { AVAILABLE_LANGUAGES, LANGUAGE_NAMES } from '../../core/i18n/transloco.providers';
import { AppLanguage } from '../../core/models';
import { LanguageService } from '../../core/services/language.service';
import {
  EXERCISE_REST_CHOICES,
  RestSettingsService,
} from '../../core/services/rest-timer/rest-settings.service';
import { formatRest } from '../../core/services/rest-timer/rest-timer.service';
import { StoragePersistenceService } from '../../core/services/storage-persistence.service';
import { SettingsSection } from '../../shared/ui/settings-section/settings-section';
import { BackupSection } from './backup/backup-section';

type StorageStatus = 'unknown' | 'persisted' | 'notPersisted';

const STORAGE_SEVERITY: Record<StorageStatus, 'secondary' | 'success' | 'warn'> = {
  unknown: 'secondary',
  persisted: 'success',
  notPersisted: 'warn',
};

@Component({
  selector: 'app-settings-page',
  imports: [FormsModule, SelectButton, Tag, TranslocoPipe, SettingsSection, BackupSection],
  templateUrl: './settings-page.html',
  styleUrl: './settings-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsPage {
  private readonly languageService = inject(LanguageService);
  private readonly storage = inject(StoragePersistenceService);
  private readonly restSettings = inject(RestSettingsService);

  /** `?restored=1`, set when the app restarts after a restore; bound by `withComponentInputBinding`. */
  readonly restored = input(false, { transform: booleanAttribute });

  protected readonly languageOptions = AVAILABLE_LANGUAGES.map((code) => ({
    code,
    label: LANGUAGE_NAMES[code],
  }));
  protected readonly language = this.languageService.current;
  protected readonly exerciseRestOptions = EXERCISE_REST_CHOICES.map((seconds) => ({
    seconds,
    label: formatRest(seconds * 1000),
  }));
  protected readonly exerciseRest = this.restSettings.exerciseRestSeconds;

  protected readonly storageStatus = computed<StorageStatus>(() => {
    const persisted = this.storage.persisted();
    if (persisted === null) {
      return 'unknown';
    }
    return persisted ? 'persisted' : 'notPersisted';
  });
  protected readonly storageSeverity = computed(() => STORAGE_SEVERITY[this.storageStatus()]);

  protected changeLanguage(language: AppLanguage): Promise<void> {
    return this.languageService.setLanguage(language);
  }

  protected changeExerciseRest(seconds: number): Promise<void> {
    return this.restSettings.setExerciseRest(seconds);
  }
}
