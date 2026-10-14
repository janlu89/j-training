import { TestBed } from '@angular/core/testing';
import { SETTINGS_ID } from '../models';
import { useTestDatabase } from '../testing/test-database';
import { SettingsRepository } from './settings.repository';

describe('SettingsRepository', () => {
  useTestDatabase();
  let repository: SettingsRepository;

  beforeEach(() => {
    repository = TestBed.inject(SettingsRepository);
  });

  it('returns undefined before anything is saved', async () => {
    expect(await repository.get()).toBeUndefined();
  });

  it('keeps a single settings record', async () => {
    await repository.save({ language: 'it' });
    await repository.save({ language: 'en' });

    expect(await repository.get()).toEqual({ id: SETTINGS_ID, language: 'en' });
  });

  it('merges changes into the saved preferences, keeping their language', async () => {
    await repository.save({ language: 'it', exerciseRestSeconds: 90 });

    await repository.merge({ lastBackupAt: 1_000 }, 'en');

    expect(await repository.get()).toEqual({
      id: SETTINGS_ID,
      language: 'it',
      exerciseRestSeconds: 90,
      lastBackupAt: 1_000,
    });
  });

  it('stores the language in use when merging into nothing', async () => {
    expect(await repository.merge({ lastBackupAt: 1_000 }, 'en')).toEqual({
      id: SETTINGS_ID,
      language: 'en',
      lastBackupAt: 1_000,
    });
  });
});
