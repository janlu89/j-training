import { BACKUP_TABLES, BackupData, BackupIssue, BackupTable, Entity } from '../../models';

/** The first relation or invariant of the app broken by the data, if any. */
export function findIntegrityIssue(data: BackupData): BackupIssue | undefined {
  return duplicateId(data) ?? brokenReference(data) ?? brokenInvariant(data);
}

function duplicateId(data: BackupData): BackupIssue | undefined {
  for (const table of BACKUP_TABLES) {
    const seen = new Set<number>();
    const records: readonly Entity[] = data[table];
    const index = records.findIndex(({ id }) => seen.has(id) || !seen.add(id));
    if (index >= 0) {
      return { code: 'duplicateId', path: `${table}[${index}].id` };
    }
  }
  return undefined;
}

/**
 * Links the app always keeps valid. Two links may legitimately point nowhere and are not checked:
 * deleting a training day keeps its finished sessions (`sessions.dayId`) and their sets
 * (`setLogs.exerciseId`), because the history outlives the plan.
 */
function brokenReference({
  phases,
  days,
  exercises,
  sessions,
  setLogs,
}: BackupData): BackupIssue | undefined {
  return (
    missingTarget('days', 'phaseId', days, (day) => day.phaseId, phases) ??
    missingTarget('exercises', 'phaseId', exercises, (exercise) => exercise.phaseId, phases) ??
    missingTarget('exercises', 'dayId', exercises, (exercise) => exercise.dayId, days) ??
    missingTarget('sessions', 'phaseId', sessions, (session) => session.phaseId, phases) ??
    missingTarget('setLogs', 'sessionId', setLogs, (log) => log.sessionId, sessions)
  );
}

function missingTarget<T>(
  table: BackupTable,
  field: string,
  records: readonly T[],
  key: (record: T) => number,
  targets: readonly Entity[],
): BackupIssue | undefined {
  const ids = new Set(targets.map(({ id }) => id));
  const index = records.findIndex((record) => !ids.has(key(record)));
  return index >= 0 ? { code: 'brokenReference', path: `${table}[${index}].${field}` } : undefined;
}

/** At most one active plan and one workout in progress: the app relies on both. */
function brokenInvariant({ phases, sessions }: BackupData): BackupIssue | undefined {
  if (phases.filter((phase) => phase.status === 'active').length > 1) {
    return { code: 'multipleActivePlans' };
  }
  if (sessions.filter((session) => session.endedAt === undefined).length > 1) {
    return { code: 'multipleOpenSessions' };
  }
  return undefined;
}
