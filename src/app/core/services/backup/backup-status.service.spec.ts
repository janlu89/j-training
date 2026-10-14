import { TestBed } from '@angular/core/testing';
import { TrainingDay } from '../../models';
import { BackupRepository } from '../../repositories/backup.repository';
import { PlanEditorRepository } from '../../repositories/plan-editor.repository';
import { SettingsRepository } from '../../repositories/settings.repository';
import { WorkoutSessionRepository } from '../../repositories/workout-session.repository';
import { useTestDatabase } from '../../testing/test-database';
import { provideTranslocoForTests } from '../../testing/transloco-testing';
import { CLOCK } from '../clock';
import { BackupStatusService } from './backup-status.service';

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date(2026, 9, 15, 9, 0).getTime();

describe('BackupStatusService', () => {
  useTestDatabase();
  let backups: BackupRepository;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideTranslocoForTests('en'), { provide: CLOCK, useValue: () => NOW }],
    });
    backups = TestBed.inject(BackupRepository);
  });

  /** Skipped workouts ended at the given times: finished sessions, like saved ones. */
  async function finishWorkouts(...endedAt: number[]): Promise<TrainingDay> {
    const editor = TestBed.inject(PlanEditorRepository);
    const workouts = TestBed.inject(WorkoutSessionRepository);
    const phaseId = await editor.createPlan({ name: 'Luglio', fase: 7 }, true);
    const dayId = await editor.addDay(phaseId, { csvGiorno: 'sabato' });
    const day = (await workouts.getDay(dayId))!.day;
    for (const at of endedAt) {
      await workouts.skipDay(day, at);
    }
    return day;
  }

  async function due(service: BackupStatusService, expected: boolean): Promise<void> {
    await vi.waitFor(() => {
      TestBed.tick();
      expect(service.reminderDue()).toBe(expected);
    });
  }

  it('finds the workouts that no backup contains yet', async () => {
    await finishWorkouts(NOW - 10 * DAY, NOW - 5 * DAY, NOW - 2 * DAY);
    await TestBed.inject(SettingsRepository).save({ language: 'it', lastBackupAt: NOW - 6 * DAY });

    expect(await backups.getStatus()).toEqual({
      lastBackupAt: NOW - 6 * DAY,
      reminderSnoozedAt: undefined,
      firstUnsavedAt: NOW - 5 * DAY,
    });
  });

  it('ignores a workout in progress', async () => {
    const day = await finishWorkouts();
    await TestBed.inject(WorkoutSessionRepository).recordSet(day, {
      exerciseId: 1,
      esercizio: 'Squat',
      fase: 7,
      date: NOW - 9 * DAY,
      setNo: 1,
      kg: 80,
      rip: 8,
      unitaCarico: 'totale',
    });

    expect((await backups.getStatus()).firstUnsavedAt).toBeUndefined();
  });

  it('reminds when workouts wait for a backup since a week, and stops once backed up', async () => {
    await finishWorkouts(NOW - 8 * DAY);
    const service = TestBed.inject(BackupStatusService);
    await due(service, true);

    await service.markBackedUp(NOW);

    await due(service, false);
    expect(service.lastBackupAt()).toBe(NOW);
  });

  it('stops reminding for a week after "later", keeping the preferences', async () => {
    await TestBed.inject(SettingsRepository).save({ language: 'it', exerciseRestSeconds: 90 });
    await finishWorkouts(NOW - 8 * DAY);
    const service = TestBed.inject(BackupStatusService);
    await due(service, true);

    await service.snoozeReminder();

    await due(service, false);
    expect(await TestBed.inject(SettingsRepository).get()).toMatchObject({
      language: 'it',
      exerciseRestSeconds: 90,
      backupReminderSnoozedAt: NOW,
    });
  });
});
