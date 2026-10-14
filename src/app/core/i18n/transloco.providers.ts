import { isDevMode } from '@angular/core';
import { provideTransloco } from '@jsverse/transloco';
import { AppLanguage } from '../models';
import { TranslocoHttpLoader } from './transloco-http-loader';

export const AVAILABLE_LANGUAGES: readonly AppLanguage[] = ['it', 'en'];
export const DEFAULT_LANGUAGE: AppLanguage = 'it';

export function provideAppTransloco() {
  return provideTransloco({
    config: {
      availableLangs: [...AVAILABLE_LANGUAGES],
      defaultLang: DEFAULT_LANGUAGE,
      fallbackLang: DEFAULT_LANGUAGE,
      missingHandler: { useFallbackTranslation: true },
      reRenderOnLangChange: true,
      prodMode: !isDevMode(),
    },
    loader: TranslocoHttpLoader,
  });
}
