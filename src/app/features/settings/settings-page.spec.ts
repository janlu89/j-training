import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { LanguageService } from '../../core/services/language.service';
import { RestSettingsService } from '../../core/services/rest-timer/rest-settings.service';
import { StoragePersistenceService } from '../../core/services/storage-persistence.service';
import { provideTranslocoForTests } from '../../core/testing/transloco-testing';
import { SettingsPage } from './settings-page';

describe('SettingsPage', () => {
  const persisted = signal<boolean | null>(null);
  const setLanguage = vi.fn().mockResolvedValue(undefined);
  const setExerciseRest = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    persisted.set(null);
    setLanguage.mockClear();
    setExerciseRest.mockClear();
    TestBed.configureTestingModule({
      providers: [
        provideTranslocoForTests(),
        { provide: LanguageService, useValue: { current: signal('it'), setLanguage } },
        { provide: StoragePersistenceService, useValue: { persisted } },
        {
          provide: RestSettingsService,
          useValue: { exerciseRestSeconds: signal(120), setExerciseRest },
        },
      ],
    });
  });

  async function render(): Promise<HTMLElement> {
    const fixture = TestBed.createComponent(SettingsPage);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  const group = (element: HTMLElement, headingId: string) =>
    element.querySelector(`p-selectbutton[aria-labelledby="${headingId}"]`)!;

  it('offers both languages', async () => {
    const element = await render();
    const options = [
      ...group(element, 'settings-language-title').querySelectorAll('p-togglebutton'),
    ];
    expect(options.map((option) => option.textContent?.trim())).toEqual(['Italiano', 'English']);
  });

  it('labels the language group with the section title', async () => {
    const element = await render();
    const languages = group(element, 'settings-language-title');
    const title = element.querySelector(`#${languages.getAttribute('aria-labelledby')}`);
    expect(title?.textContent).toContain('Lingua');
  });

  it('switches language when an option is chosen', async () => {
    const element = await render();
    const english = [...element.querySelectorAll<HTMLElement>('p-togglebutton')].find((button) =>
      button.textContent?.includes('English'),
    );
    english?.click();
    expect(setLanguage).toHaveBeenCalledWith('en');
  });

  it('offers the rest between exercises, two minutes selected by default', async () => {
    const element = await render();
    const options = [
      ...group(element, 'settings-exercise-rest-title').querySelectorAll<HTMLElement>(
        'p-togglebutton',
      ),
    ];
    expect(options.map((option) => option.textContent?.trim())).toEqual([
      '1:00',
      '1:30',
      '2:00',
      '2:30',
      '3:00',
    ]);
    expect(options.map((option) => option.getAttribute('aria-pressed'))).toEqual([
      'false',
      'false',
      'true',
      'false',
      'false',
    ]);

    options[1].click();
    expect(setExerciseRest).toHaveBeenCalledWith(90);
  });

  it.each([
    [null, 'Verifica in corso'],
    [true, 'Protetta'],
    [false, 'Non garantita'],
  ])('shows the storage status when persisted is %s', async (value, label) => {
    persisted.set(value);
    const element = await render();
    expect(element.querySelector('p-tag')?.textContent).toContain(label);
  });
});
