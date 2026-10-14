import { Translation, TranslocoLoader, provideTransloco } from '@jsverse/transloco';
import { Observable, of } from 'rxjs';
import en from '../../../../public/i18n/en.json';
import it from '../../../../public/i18n/it.json';

const TRANSLATIONS: Record<string, Translation> = { it, en };

class StaticLoader implements TranslocoLoader {
  getTranslation(lang: string): Observable<Translation> {
    return of(TRANSLATIONS[lang]);
  }
}

/** Transloco backed by the real translation files, loaded synchronously. */
export function provideTranslocoForTests(lang: 'it' | 'en' = 'it') {
  return provideTransloco({
    config: { availableLangs: ['it', 'en'], defaultLang: lang, reRenderOnLangChange: true },
    loader: StaticLoader,
  });
}

export const TEST_TRANSLATIONS = TRANSLATIONS;
