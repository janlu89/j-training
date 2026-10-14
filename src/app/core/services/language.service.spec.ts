import { DOCUMENT } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  Translation,
  TranslocoLoader,
  TranslocoService,
  provideTransloco,
} from '@jsverse/transloco';
import { Observable, of } from 'rxjs';
import { SettingsRepository } from '../repositories/settings.repository';
import { useTestDatabase } from '../testing/test-database';
import { LanguageService } from './language.service';

class InlineLoader implements TranslocoLoader {
  getTranslation(lang: string): Observable<Translation> {
    return of({ greeting: lang === 'it' ? 'Ciao' : 'Hello' });
  }
}

describe('LanguageService', () => {
  useTestDatabase();
  let service: LanguageService;
  let transloco: TranslocoService;
  let settings: SettingsRepository;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideTransloco({
          config: { availableLangs: ['it', 'en'], defaultLang: 'it', reRenderOnLangChange: true },
          loader: InlineLoader,
        }),
      ],
    });
    service = TestBed.inject(LanguageService);
    transloco = TestBed.inject(TranslocoService);
    settings = TestBed.inject(SettingsRepository);
  });

  function mockBrowserLanguage(language: string): void {
    vi.spyOn(TestBed.inject(DOCUMENT).defaultView!.navigator, 'language', 'get').mockReturnValue(
      language,
    );
  }

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('restores the saved language at startup', async () => {
    await settings.save({ language: 'en' });

    await service.init();

    expect(transloco.getActiveLang()).toBe('en');
    expect(transloco.translate('greeting')).toBe('Hello');
  });

  it('falls back to the browser language when nothing is saved', async () => {
    mockBrowserLanguage('en-GB');
    await service.init();
    expect(service.current()).toBe('en');
  });

  it('falls back to Italian for unsupported browser languages', async () => {
    mockBrowserLanguage('de-DE');
    await service.init();
    expect(service.current()).toBe('it');
  });

  it('switches language at runtime, persists it and updates the document', async () => {
    await service.init();

    await service.setLanguage('en');

    expect(service.current()).toBe('en');
    expect((await settings.get())?.language).toBe('en');
    expect(TestBed.inject(DOCUMENT).documentElement.lang).toBe('en');
  });
});
