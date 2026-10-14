import { Injectable, computed, inject, resource } from '@angular/core';
import { AppLanguage, DEFAULT_EXERCISE_REST_SECONDS, SETTINGS_ID } from '../../models';
import { SettingsRepository } from '../../repositories/settings.repository';
import { LanguageService } from '../language.service';

/** Choices offered in the settings for the rest between exercises. */
export const EXERCISE_REST_CHOICES = [60, 90, 120, 150, 180] as const;

/** The rest before the next exercise: a device preference, two minutes unless changed. */
@Injectable({ providedIn: 'root' })
export class RestSettingsService {
  private readonly settings = inject(SettingsRepository);
  private readonly language = inject(LanguageService);
  private readonly stored = resource({ loader: () => this.settings.get() });

  readonly exerciseRestSeconds = computed(
    () => this.stored.value()?.exerciseRestSeconds ?? DEFAULT_EXERCISE_REST_SECONDS,
  );

  async setExerciseRest(seconds: number): Promise<void> {
    const saved = await this.settings.get();
    // The settings record always carries a language: the one in use when none was saved yet.
    const next = {
      language: this.language.current() as AppLanguage,
      ...saved,
      exerciseRestSeconds: seconds,
    };
    await this.settings.save(next);
    this.stored.set({ ...next, id: SETTINGS_ID });
  }
}
