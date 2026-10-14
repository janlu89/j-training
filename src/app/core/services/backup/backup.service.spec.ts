import { TestBed } from '@angular/core/testing';
import { BackupFile } from '../../models';
import { BackupRepository } from '../../repositories/backup.repository';
import { PlanEditorRepository } from '../../repositories/plan-editor.repository';
import { SettingsRepository } from '../../repositories/settings.repository';
import { NewSet, WorkoutSessionRepository } from '../../repositories/workout-session.repository';
import { newExerciseInput } from '../../testing/fixtures';
import { useTestDatabase } from '../../testing/test-database';
import { CLOCK } from '../clock';
import { FileDownloadService } from '../file-download.service';
import { MAX_BACKUP_FILE_BYTES, BackupService, summarizeBackup } from './backup.service';

/** Wednesday 14 October 2026, 20:30 in Italy. */
const NOW = Date.parse('2026-10-14T18:30:00Z');

function set(exerciseId: number, esercizio: string, setNo: number, kg: number): NewSet {
  return { exerciseId, esercizio, fase: 7, date: NOW, setNo, kg, rip: 8, unitaCarico: 'totale' };
}

function jsonFile(value: unknown, name = 'backup.json'): File {
  return new File([JSON.stringify(value)], name, { type: 'application/json' });
}

describe('BackupService', () => {
  const database = useTestDatabase();
  const save = vi.fn();
  let service: BackupService;
  let editor: PlanEditorRepository;
  let workouts: WorkoutSessionRepository;

  beforeEach(() => {
    save.mockClear();
    TestBed.configureTestingModule({
      providers: [
        { provide: CLOCK, useValue: () => NOW },
        { provide: FileDownloadService, useValue: { save } },
      ],
    });
    service = TestBed.inject(BackupService);
    editor = TestBed.inject(PlanEditorRepository);
    workouts = TestBed.inject(WorkoutSessionRepository);
  });

  /**
   * Data as the app produces it: an archived and an active plan, a saved workout, a skipped day,
   * a workout in progress, a removed exercise and a deleted day whose history remains.
   */
  async function seedTrainingData(): Promise<void> {
    await editor.createPlan({ name: 'Giugno', fase: 6 }, true);
    const july = await editor.createPlan({ name: 'Luglio', fase: 7 }, true);
    const legs = await editor.addDay(july, { csvGiorno: 'sabato', weekday: 6 });
    const chest = await editor.addDay(july, { csvGiorno: 'mercoledi' });
    const arms = await editor.addDay(july, { csvGiorno: 'venerdi' });
    const squat = await editor.addExercise(legs, newExerciseInput({ esercizio: 'Squat' }));
    const lunge = await editor.addExercise(legs, newExerciseInput({ ultimoKg: null }));
    await editor.addExercise(chest, newExerciseInput({ recSec: null }));
    const curl = await editor.addExercise(arms, newExerciseInput({ esercizio: 'Curl' }));
    await editor.removeExercise(lunge);
    const [legsDay, chestDay, armsDay] = await Promise.all(
      [legs, chest, arms].map(async (id) => (await workouts.getDay(id))!.day),
    );
    await workouts.saveDay(
      legsDay,
      [set(squat, 'Squat', 1, 80), set(squat, 'Squat', 2, 82.5)],
      NOW,
      [{ exerciseId: squat, ultimoKg: 82.5 }],
    );
    await workouts.saveDay(armsDay, [set(curl, 'Curl', 1, 12)], NOW, []);
    await editor.deleteDay(arms);
    await workouts.skipDay(chestDay, NOW);
    await workouts.recordSet(legsDay, set(squat, 'Squat', 1, 85));
  }

  const withoutDate = ({ exportedAt, ...data }: BackupFile) => data;

  it('restores a backup identical to the original on an empty database', async () => {
    await seedTrainingData();
    const original = await service.createBackup();

    // A new browser: nothing stored yet.
    await database().delete();
    await database().open();
    const read = await service.read(jsonFile(original));
    if (!read.ok) throw new Error(`backup refused: ${read.issue.code}`);
    await service.restore(read.backup);

    expect(withoutDate(await service.createBackup())).toStrictEqual(withoutDate(original));
  });

  it('replaces every record of the device, ids included', async () => {
    await seedTrainingData();
    const backup = await service.createBackup();
    await database().delete();
    await database().open();
    const other = await editor.createPlan({ name: 'Altro telefono', fase: 1 }, true);
    await editor.addDay(other, { csvGiorno: 'lunedi' });

    await service.restore(backup);

    const stored = await TestBed.inject(BackupRepository).readAll();
    expect(stored.phases.map(({ id, name }) => [id, name])).toEqual([
      [1, 'Giugno'],
      [2, 'Luglio'],
    ]);
    expect(stored.days).toEqual(backup.days);
  });

  it('continues the ids after the highest restored one', async () => {
    await seedTrainingData();
    const backup = await service.createBackup();
    await database().delete();
    await database().open();
    await service.restore(backup);

    const id = await editor.createPlan({ name: 'Agosto', fase: 8 }, false);

    expect(id).toBe(Math.max(...backup.phases.map((phase) => phase.id)) + 1);
  });

  it('keeps the current data when the restore fails half way', async () => {
    await seedTrainingData();
    const before = await service.createBackup();
    const broken = { ...before, setLogs: [before.setLogs[0], before.setLogs[0]] };

    await expect(service.restore(broken)).rejects.toThrow();

    expect(withoutDate(await service.createBackup())).toStrictEqual(withoutDate(before));
  });

  it('leaves the device preferences out of the backup and untouched by a restore', async () => {
    const settings = TestBed.inject(SettingsRepository);
    await settings.save({ language: 'en', exerciseRestSeconds: 90 });
    const backup = await service.createBackup();

    await service.restore(backup);

    expect(Object.keys(backup)).not.toContain('settings');
    expect(await settings.get()).toEqual({ id: 1, language: 'en', exerciseRestSeconds: 90 });
  });

  it('saves the backup as a dated JSON file', async () => {
    await seedTrainingData();

    const fileName = await service.exportToFile();

    expect(fileName).toBe('j-training-backup-2026-10-14.json');
    const [blob, savedName] = save.mock.calls[0] as [Blob, string];
    expect(savedName).toBe(fileName);
    expect(blob.type).toBe('application/json');
    const saved = JSON.parse(await blob.text()) as BackupFile;
    expect(saved).toMatchObject({ schemaVersion: 1, exportedAt: '2026-10-14T18:30:00.000Z' });
    expect(saved.phases.map((phase) => phase.name)).toEqual(['Giugno', 'Luglio']);
  });

  it('refuses files larger than the limit without reading them', async () => {
    const big = new File(['x'], 'big.json');
    Object.defineProperty(big, 'size', { value: MAX_BACKUP_FILE_BYTES + 1 });
    const text = vi.spyOn(big, 'text');

    expect(await service.read(big)).toEqual({ ok: false, issue: { code: 'fileTooLarge' } });
    expect(text).not.toHaveBeenCalled();
  });

  it('summarizes what a backup contains', async () => {
    await seedTrainingData();

    expect(summarizeBackup(await service.createBackup())).toEqual({
      exportedAt: NOW,
      plans: 2,
      sessions: 4,
      sets: 4,
    });
  });
});
