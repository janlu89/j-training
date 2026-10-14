export const DB_NAME = 'j-training';

/**
 * Schema history: never edit a released version, add a new `this.version(n)` with an upgrade.
 * Only indexed fields are listed; `++id` is an auto-incremented primary key, `[a+b]` a compound index.
 */
export const SCHEMA_V1 = {
  phases: '++id, status, fase',
  days: '++id, phaseId, [phaseId+ordine]',
  exercises: '++id, phaseId, dayId, [dayId+ordine], esercizio, stato',
  sessions: '++id, phaseId, dayId, startedAt',
  setLogs: '++id, sessionId, exerciseId, esercizio, fase, date, [esercizio+date]',
  settings: 'id',
} as const;
