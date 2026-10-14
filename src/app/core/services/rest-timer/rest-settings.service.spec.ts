import { TestBed } from '@angular/core/testing';
import { SettingsRepository } from '../../repositories/settings.repository';
import { useTestDatabase } from '../../testing/test-database';
import { provideTranslocoForTests } from '../../testing/transloco-testing';
import { RestSettingsService } from './rest-settings.service';

describe('RestSettingsService', () => {
  useTestDatabase();

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideTranslocoForTests('en')] });
  });

  async function settled(service: RestSettingsService, seconds: number): Promise<void> {
    await vi.waitFor(() => {
      TestBed.tick();
      expect(service.exerciseRestSeconds()).toBe(seconds);
    });
  }

  it('rests 2 minutes between exercises by default', () => {
    expect(TestBed.inject(RestSettingsService).exerciseRestSeconds()).toBe(120);
  });

  it('saves the chosen rest, keeping the saved language', async () => {
    const settings = TestBed.inject(SettingsRepository);
    await settings.save({ language: 'it' });
    const service = TestBed.inject(RestSettingsService);

    await service.setExerciseRest(90);

    expect(service.exerciseRestSeconds()).toBe(90);
    expect(await settings.get()).toMatchObject({ language: 'it', exerciseRestSeconds: 90 });
  });

  it('restores the saved rest at startup', async () => {
    await TestBed.inject(SettingsRepository).save({ language: 'it', exerciseRestSeconds: 150 });
    await settled(TestBed.inject(RestSettingsService), 150);
  });

  it('saves the language in use when no settings exist yet', async () => {
    await TestBed.inject(RestSettingsService).setExerciseRest(60);
    expect(await TestBed.inject(SettingsRepository).get()).toMatchObject({
      language: 'en',
      exerciseRestSeconds: 60,
    });
  });
});
