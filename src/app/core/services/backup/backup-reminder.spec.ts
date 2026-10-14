import { BACKUP_REMINDER_INTERVAL_MS, isBackupReminderDue } from './backup-reminder';

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date(2026, 9, 15, 9, 0).getTime();
const daysAgo = (days: number) => NOW - days * DAY;

describe('isBackupReminderDue', () => {
  it('waits a week', () => {
    expect(BACKUP_REMINDER_INTERVAL_MS).toBe(7 * DAY);
  });

  it('stays quiet when every workout is in a backup', () => {
    expect(isBackupReminderDue({ lastBackupAt: daysAgo(30) }, NOW)).toBe(false);
  });

  it('reminds a week after the last backup when workouts came after it', () => {
    expect(isBackupReminderDue({ lastBackupAt: daysAgo(7), firstUnsavedAt: daysAgo(2) }, NOW)).toBe(
      true,
    );
    expect(isBackupReminderDue({ lastBackupAt: daysAgo(6), firstUnsavedAt: daysAgo(2) }, NOW)).toBe(
      false,
    );
  });

  it('on a device never backed up, reminds a week after the first workout', () => {
    expect(isBackupReminderDue({ firstUnsavedAt: daysAgo(8) }, NOW)).toBe(true);
    expect(isBackupReminderDue({ firstUnsavedAt: daysAgo(3) }, NOW)).toBe(false);
  });

  it('after "later" comes back only a week later', () => {
    const status = { lastBackupAt: daysAgo(20), firstUnsavedAt: daysAgo(15) };

    expect(isBackupReminderDue({ ...status, reminderSnoozedAt: daysAgo(6) }, NOW)).toBe(false);
    expect(isBackupReminderDue({ ...status, reminderSnoozedAt: daysAgo(7) }, NOW)).toBe(true);
  });
});
