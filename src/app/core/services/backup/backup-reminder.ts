import { BackupStatus, EpochMs } from '../../models';

const DAY_MS = 24 * 60 * 60 * 1000;

/** A week: often enough not to lose much, rare enough not to nag. */
export const BACKUP_REMINDER_INTERVAL_MS = 7 * DAY_MS;

/**
 * The reminder appears only when there is something to save, a week after the last backup (or, on
 * a device never backed up, a week after the first workout to save), and a week after the user
 * last chose "later".
 */
export function isBackupReminderDue(
  { lastBackupAt, reminderSnoozedAt, firstUnsavedAt }: BackupStatus,
  now: EpochMs,
): boolean {
  if (firstUnsavedAt === undefined) {
    return false;
  }
  const waitingSince = lastBackupAt ?? firstUnsavedAt;
  const snoozed =
    reminderSnoozedAt !== undefined && now - reminderSnoozedAt < BACKUP_REMINDER_INTERVAL_MS;
  return now - waitingSince >= BACKUP_REMINDER_INTERVAL_MS && !snoozed;
}
