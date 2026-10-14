import { Injectable, inject } from '@angular/core';
import { AppDatabase } from '../db/app-database';
import { AppSettings, NewEntity, SETTINGS_ID } from '../models';

/** Device preferences live in a single record with a fixed key. */
@Injectable({ providedIn: 'root' })
export class SettingsRepository {
  private readonly db = inject(AppDatabase);

  get(): Promise<AppSettings | undefined> {
    return this.db.settings.get(SETTINGS_ID);
  }

  async save(settings: NewEntity<AppSettings>): Promise<void> {
    await this.db.settings.put({ ...settings, id: SETTINGS_ID });
  }
}
