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
});
