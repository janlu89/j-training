import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { WorkoutDay } from '../models';
import { ExerciseRepository } from '../repositories/exercise.repository';
import { PlanEditorRepository } from '../repositories/plan-editor.repository';
import { SessionRepository } from '../repositories/session.repository';
import { SetLogRepository } from '../repositories/set-log.repository';
import { newExerciseInput } from '../testing/fixtures';
import { useTestDatabase } from '../testing/test-database';
import { CLOCK } from './clock';
import { WorkoutSessionService } from './workout-session.service';

describe('WorkoutSessionService', () => {
  useTestDatabase();
  let now: number;
  let service: WorkoutSessionService;
  let dayId: number;

  beforeEach(async () => {
    now = 1_000;
    TestBed.configureTestingModule({ providers: [{ provide: CLOCK, useValue: () => now }] });
    service = TestBed.inject(WorkoutSessionService);
    const editor = TestBed.inject(PlanEditorRepository);
    const phaseId = await editor.createPlan({ name: 'Ottobre', fase: 4 }, true);
    dayId = await editor.addDay(phaseId, { csvGiorno: 'A' });
    await editor.addExercise(
      dayId,
      newExerciseInput({ esercizio: 'Curl', unitaCarico: 'per_braccio', ultimoKg: 12 }),
    );
  });

  const workout = async (): Promise<WorkoutDay> => (await firstValueFrom(service.watchDay(dayId)))!;

  it('stamps each set with time, exercise name, phase and load unit', async () => {
    const day = await workout();
    const exercise = day.exercises[0].exercise;
    const id = await service.recordSet(day, { exercise, setNo: 1, values: { kg: 14, rip: 10 } });

    expect(await TestBed.inject(SetLogRepository).getById(id)).toMatchObject({
      esercizio: 'Curl',
      fase: 4,
      date: 1_000,
      setNo: 1,
      kg: 14,
      rip: 10,
      unitaCarico: 'per_braccio',
    });
  });

  it('saves the day at the current time with the chosen loads', async () => {
    let day = await workout();
    const curl = day.exercises[0].exercise;
    await service.recordSet(day, { exercise: curl, setNo: 1, values: { kg: 14, rip: 10 } });
    day = await workout();
    now = 4_000;

    await service.saveDay(day, [], [{ exerciseId: curl.id, ultimoKg: 14 }]);

    expect(await TestBed.inject(SessionRepository).getById(day.session!.id)).toMatchObject({
      startedAt: 1_000,
      endedAt: 4_000,
      outcome: 'completed',
    });
    expect((await TestBed.inject(ExerciseRepository).getById(curl.id))?.ultimoKg).toBe(14);
  });

  it('saves sets filled in at the end, stamped with the save time', async () => {
    const day = await workout();
    const curl = day.exercises[0].exercise;
    now = 5_000;

    await service.saveDay(day, [{ exercise: curl, setNo: 1, values: { kg: 12, rip: 12 } }], []);

    const [session] = await TestBed.inject(SessionRepository).getAll();
    expect(session).toMatchObject({ startedAt: 5_000, endedAt: 5_000, outcome: 'completed' });
    expect(await TestBed.inject(SetLogRepository).getBySession(session.id)).toEqual([
      expect.objectContaining({ esercizio: 'Curl', fase: 4, date: 5_000, kg: 12, rip: 12 }),
    ]);
  });

  it('cannot save a day with nothing to save', async () => {
    await expect(service.saveDay(await workout(), [], [])).rejects.toThrow();
  });

  it('skips the day at the current time', async () => {
    await service.skipDay(await workout());
    expect(await TestBed.inject(SessionRepository).getAll()).toEqual([
      expect.objectContaining({ dayId, startedAt: 1_000, endedAt: 1_000, outcome: 'skipped' }),
    ]);
  });
});
