import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { SelectButton } from 'primeng/selectbutton';
import { Tag } from 'primeng/tag';
import { AVAILABLE_LANGUAGES, LANGUAGE_NAMES } from '../../core/i18n/transloco.providers';
import { AppLanguage } from '../../core/models';
import { LanguageService } from '../../core/services/language.service';
import { StoragePersistenceService } from '../../core/services/storage-persistence.service';
import { SettingsSection } from '../../shared/ui/settings-section/settings-section';

type StorageStatus = 'unknown' | 'persisted' | 'notPersisted';

const STORAGE_SEVERITY: Record<StorageStatus, 'secondary' | 'success' | 'warn'> = {
  unknown: 'secondary',
  persisted: 'success',
  notPersisted: 'warn',
};

@Component({
  selector: 'app-settings-page',
  imports: [FormsModule, SelectButton, Tag, TranslocoPipe, SettingsSection],
  templateUrl: './settings-page.html',
  styleUrl: './settings-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsPage {
  private readonly languageService = inject(LanguageService);
  private readonly storage = inject(StoragePersistenceService);

  protected readonly languageOptions = AVAILABLE_LANGUAGES.map((code) => ({
    code,
    label: LANGUAGE_NAMES[code],
  }));
  protected readonly language = this.languageService.current;

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
}
