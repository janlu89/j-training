import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { LanguageService } from '../../core/services/language.service';
import { StoragePersistenceService } from '../../core/services/storage-persistence.service';
import { provideTranslocoForTests } from '../../core/testing/transloco-testing';
import { SettingsPage } from './settings-page';

describe('SettingsPage', () => {
  const persisted = signal<boolean | null>(null);
  const setLanguage = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    persisted.set(null);
    setLanguage.mockClear();
    TestBed.configureTestingModule({
      providers: [
        provideTranslocoForTests(),
        { provide: LanguageService, useValue: { current: signal('it'), setLanguage } },
        { provide: StoragePersistenceService, useValue: { persisted } },
      ],
    });
  });

  async function render(): Promise<HTMLElement> {
    const fixture = TestBed.createComponent(SettingsPage);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('offers both languages', async () => {
    const element = await render();
    const options = [...element.querySelectorAll('p-togglebutton')];
    expect(options.map((option) => option.textContent?.trim())).toEqual(['Italiano', 'English']);
  });

  it('labels the language group with the section title', async () => {
    const element = await render();
    const group = element.querySelector('p-selectbutton');
    const title = element.querySelector(`#${group?.getAttribute('aria-labelledby')}`);
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
