import { Entity } from './entity.model';

export type AppLanguage = 'it' | 'en';

/** Device preferences. A single record (`SETTINGS_ID`), not part of the data backup. */
export interface AppSettings extends Entity {
  language: AppLanguage;
  /** Rest before the next exercise; the default applies while it is not set. */
  exerciseRestSeconds?: number;
}

export const SETTINGS_ID = 1;
