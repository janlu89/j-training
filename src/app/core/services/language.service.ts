import { DOCUMENT, Injectable, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoService } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';
import { AVAILABLE_LANGUAGES, DEFAULT_LANGUAGE } from '../i18n/transloco.providers';
import { AppLanguage } from '../models';
import { SettingsRepository } from '../repositories/settings.repository';

/** Active UI language: restored from settings at startup, switchable at runtime. */
@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly transloco = inject(TranslocoService);
  private readonly settings = inject(SettingsRepository);
  private readonly document = inject(DOCUMENT);

  readonly current = toSignal(this.transloco.langChanges$, {
    initialValue: this.transloco.getActiveLang(),
  });

  /** Called once at bootstrap; translations are loaded before the first render. */
  async init(): Promise<void> {
    const saved = await this.settings.get();
    await this.apply(saved?.language ?? this.detectBrowserLanguage());
  }

  async setLanguage(language: AppLanguage): Promise<void> {
    await this.apply(language);
    const saved = await this.settings.get();
    await this.settings.save({ ...saved, language });
  }

  private async apply(language: AppLanguage): Promise<void> {
    await firstValueFrom(this.transloco.load(language));
    this.transloco.setActiveLang(language);
    this.document.documentElement.lang = language;
  }

  private detectBrowserLanguage(): AppLanguage {
    const browser = this.document.defaultView?.navigator.language.slice(0, 2);
    return AVAILABLE_LANGUAGES.find((language) => language === browser) ?? DEFAULT_LANGUAGE;
  }
}
