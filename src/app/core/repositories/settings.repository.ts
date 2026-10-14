import { Injectable, inject } from '@angular/core';
import { AppDatabase } from '../db/app-database';
import { AppLanguage, AppSettings, NewEntity, SETTINGS_ID } from '../models';

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

  /**
   * Changes some preferences and keeps the others. The record always carries a language: `language`,
   * the one in use, is stored only when nothing was saved yet.
   */
  merge(changes: Partial<NewEntity<AppSettings>>, language: AppLanguage): Promise<AppSettings> {
    const { db } = this;
    return db.transaction('rw', db.settings, async () => {
      const next: AppSettings = { language, ...(await this.get()), ...changes, id: SETTINGS_ID };
      await db.settings.put(next);
      return next;
    });
  }
}
