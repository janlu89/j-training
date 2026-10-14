import { TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import { Workbook } from 'exceljs';
import { firstValueFrom } from 'rxjs';
import { PlanEditorRepository } from '../../repositories/plan-editor.repository';
import { NewSet, WorkoutSessionRepository } from '../../repositories/workout-session.repository';
import { newExerciseInput } from '../../testing/fixtures';
import { useTestDatabase } from '../../testing/test-database';
import { provideTranslocoForTests } from '../../testing/transloco-testing';
import { FileDownloadService } from '../file-download.service';
import { PlanExportService } from './plan-export.service';

const NOW = new Date(2026, 9, 14, 19, 0).getTime();

describe('PlanExportService', () => {
  useTestDatabase();
  const save = vi.fn<(content: Blob, fileName: string) => void>();
  let service: PlanExportService;
  let editor: PlanEditorRepository;
  let workouts: WorkoutSessionRepository;

  beforeEach(async () => {
    save.mockClear();
    TestBed.configureTestingModule({
      providers: [provideTranslocoForTests(), { provide: FileDownloadService, useValue: { save } }],
    });
    await firstValueFrom(TestBed.inject(TranslocoService).load('it'));
    service = TestBed.inject(PlanExportService);
    editor = TestBed.inject(PlanEditorRepository);
    workouts = TestBed.inject(WorkoutSessionRepository);
  });

  /** A plan with a saved workout and a workout still in progress. */
  async function seedPlan(name = 'Luglio'): Promise<number> {
    const phaseId = await editor.createPlan({ name, fase: 7 }, true);
    const dayId = await editor.addDay(phaseId, { csvGiorno: 'sabato' });
    const squat = await editor.addExercise(dayId, newExerciseInput({ esercizio: 'Squat' }));
    const day = (await workouts.getDay(dayId))!.day;
    const set = (kg: number, date: number): NewSet => ({
      exerciseId: squat,
      esercizio: 'Squat',
      fase: 7,
      date,
      setNo: 1,
      kg,
      rip: 8,
      unitaCarico: 'totale',
    });
    await workouts.saveDay(day, [set(80, NOW)], NOW, []);
    await workouts.recordSet(day, set(85, NOW + 86_400_000));
    return phaseId;
  }

  async function saved(): Promise<{ fileName: string; content: Blob }> {
    const [content, fileName] = save.mock.calls[0];
    return { fileName, content };
  }

  it('exports the plan and its saved sets to CSV, without the workout in progress', async () => {
    const phaseId = await seedPlan();

    const fileName = await service.export(phaseId, 'csv');

    expect(fileName).toBe('Luglio - fase 7.csv');
    const { content } = await saved();
    const lines = (await content.text()).trim().split('\r\n');
    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain(',Squat,');
    expect(lines[1]).toContain(',2026-10-14,1,80,8');
  });

  it('exports the plan and its saved sets to an Excel workbook', async () => {
    const phaseId = await seedPlan();

    expect(await service.export(phaseId, 'xlsx')).toBe('Luglio - fase 7.xlsx');

    const book = new Workbook();
    await book.xlsx.load(await (await saved()).content.arrayBuffer());
    expect(book.getWorksheet('Serie')!.rowCount).toBe(2);
    expect(book.getWorksheet('Serie')!.getRow(2).getCell(5).value).toBe(80);
  });

  it('turns the plan name into a safe file name', async () => {
    const phaseId = await seedPlan('Forza: A/B *v2*');

    expect(await service.export(phaseId, 'csv')).toBe('Forza- A-B -v2- - fase 7.csv');
  });

  it('fails for a plan that does not exist', async () => {
    await expect(service.export(404, 'csv')).rejects.toThrow('Plan 404 does not exist');
    expect(save).not.toHaveBeenCalled();
  });
});
