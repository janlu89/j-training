import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { TrainingDay } from '../models';
import { newExerciseInput } from '../testing/fixtures';
import { useTestDatabase } from '../testing/test-database';
import { ExerciseRepository } from './exercise.repository';
import { PlanEditorRepository } from './plan-editor.repository';
import { SessionRepository } from './session.repository';
import { SetLogRepository } from './set-log.repository';
import {
  NewSet,
  OpenSessionConflictError,
  WorkoutSessionRepository,
} from './workout-session.repository';

describe('WorkoutSessionRepository', () => {
  useTestDatabase();
  let workouts: WorkoutSessionRepository;
  let sessions: SessionRepository;
  let setLogs: SetLogRepository;
  let days: TrainingDay[];
  let squat: number;
  let bench: number;

  beforeEach(async () => {
    workouts = TestBed.inject(WorkoutSessionRepository);
    sessions = TestBed.inject(SessionRepository);
    setLogs = TestBed.inject(SetLogRepository);
    const editor = TestBed.inject(PlanEditorRepository);
    const phaseId = await editor.createPlan({ name: 'Ottobre', fase: 3 }, true);
    const dayIds = [
      await editor.addDay(phaseId, { csvGiorno: 'A' }),
      await editor.addDay(phaseId, { csvGiorno: 'B' }),
    ];
    squat = await editor.addExercise(dayIds[0], newExerciseInput({ esercizio: 'Squat' }));
    bench = await editor.addExercise(dayIds[0], newExerciseInput({ esercizio: 'Panca piana' }));
    await editor.addExercise(dayIds[1], newExerciseInput({ esercizio: 'Squat' }));
    days = await Promise.all(dayIds.map(async (id) => (await workouts.getDay(id))!.day));
  });

  function set(exerciseId: number, setNo: number, kg: number, date = 1000): NewSet {
    const esercizio = exerciseId === squat ? 'Squat' : 'Panca piana';
    return { exerciseId, esercizio, fase: 3, date, setNo, kg, rip: 8, unitaCarico: 'totale' };
  }

  it('starts the session with the first recorded set, not when the day is opened', async () => {
    expect((await workouts.getDay(days[0].id))?.session).toBeUndefined();

    await workouts.recordSet(days[0], set(squat, 1, 80, 5000));
    await workouts.recordSet(days[0], set(squat, 2, 85));

    const day = await workouts.getDay(days[0].id);
    expect(day?.session).toMatchObject({ dayId: days[0].id, startedAt: 5000 });
    expect(day?.session?.endedAt).toBeUndefined();
    expect(day?.exercises[0].sets.map((log) => [log.setNo, log.kg])).toEqual([
      [1, 80],
      [2, 85],
    ]);
    expect(await sessions.getAll()).toHaveLength(1);
  });

  it('overwrites a set recorded twice', async () => {
    const first = await workouts.recordSet(days[0], set(squat, 1, 80));
    const second = await workouts.recordSet(days[0], set(squat, 1, 82.5));

    expect(second).toBe(first);
    expect((await setLogs.getById(first))?.kg).toBe(82.5);
  });

  it('allows a single workout in progress', async () => {
    await workouts.recordSet(days[0], set(squat, 1, 80));

    await expect(workouts.recordSet(days[1], set(squat, 1, 80))).rejects.toBeInstanceOf(
      OpenSessionConflictError,
    );
    const other = await workouts.getDay(days[1].id);
    expect(other?.session).toBeUndefined();
    expect(other?.otherOpenSession?.day.id).toBe(days[0].id);
  });

  it('updates a recorded set', async () => {
    const id = await workouts.recordSet(days[0], set(squat, 1, 80));
    await workouts.updateSet(id, { kg: 90, rip: 5 });
    expect(await setLogs.getById(id)).toMatchObject({ kg: 90, rip: 5 });
  });

  it('removes the draft together with its last set', async () => {
    const first = await workouts.recordSet(days[0], set(squat, 1, 80));
    const second = await workouts.recordSet(days[0], set(squat, 2, 80));

    await workouts.removeSet(first);
    expect(await sessions.getAll()).toHaveLength(1);

    await workouts.removeSet(second);
    expect(await sessions.getAll()).toEqual([]);
  });

  it('saves the draft and copies the chosen loads into the plan atomically', async () => {
    await workouts.recordSet(days[0], set(squat, 1, 90));
    const session = (await workouts.getDay(days[0].id))!.session!;

    const saved = await workouts.saveDay(days[0], [], 9000, [{ exerciseId: squat, ultimoKg: 90 }]);

    expect(saved).toBe(session.id);
    expect(await sessions.getById(session.id)).toMatchObject({
      endedAt: 9000,
      outcome: 'completed',
    });
    const exercises = TestBed.inject(ExerciseRepository);
    expect((await exercises.getById(squat))?.ultimoKg).toBe(90);
    expect((await exercises.getById(bench))?.ultimoKg).toBe(60);
    expect((await workouts.getDay(days[0].id))?.session).toBeUndefined();
  });

  it('saves a day filled in at the end without any ticked set', async () => {
    const id = await workouts.saveDay(
      days[0],
      [set(squat, 1, 80, 8000), set(squat, 2, 82.5, 8000), set(bench, 1, 60, 8000)],
      9000,
      [],
    );

    expect(await sessions.getById(id)).toMatchObject({
      dayId: days[0].id,
      startedAt: 8000,
      endedAt: 9000,
      outcome: 'completed',
    });
    expect(
      (await setLogs.getBySession(id)).map((log) => [log.esercizio, log.setNo, log.kg]),
    ).toEqual([
      ['Squat', 1, 80],
      ['Squat', 2, 82.5],
      ['Panca piana', 1, 60],
    ]);
  });

  it('adds the sets not ticked to the draft, without duplicating the ticked ones', async () => {
    await workouts.recordSet(days[0], set(squat, 1, 90));
    const draft = (await workouts.getDay(days[0].id))!.session!;

    await workouts.saveDay(days[0], [set(squat, 1, 95), set(squat, 2, 90)], 9000, []);

    expect((await setLogs.getBySession(draft.id)).map((log) => [log.setNo, log.kg])).toEqual([
      [1, 95],
      [2, 90],
    ]);
  });

  it('refuses to save a day with nothing to save, changing nothing', async () => {
    await workouts.recordSet(days[0], set(squat, 1, 90));
    await workouts.saveDay(days[0], [], 9000, []);

    await expect(
      workouts.saveDay(days[0], [], 9500, [{ exerciseId: squat, ultimoKg: 200 }]),
    ).rejects.toThrow();
    expect((await TestBed.inject(ExerciseRepository).getById(squat))?.ultimoKg).toBe(60);
  });

  it('does not save a day while another day has a workout in progress', async () => {
    await workouts.recordSet(days[0], set(squat, 1, 90));
    await expect(workouts.saveDay(days[1], [set(squat, 1, 80)], 9000, [])).rejects.toBeInstanceOf(
      OpenSessionConflictError,
    );
  });

  it('records a skipped day as a finished session without sets', async () => {
    const id = await workouts.skipDay(days[1], 7000);
    expect(await sessions.getById(id)).toMatchObject({
      dayId: days[1].id,
      startedAt: 7000,
      endedAt: 7000,
      outcome: 'skipped',
    });
  });

  it('does not skip a day with a workout in progress', async () => {
    await workouts.recordSet(days[0], set(squat, 1, 80));
    await expect(workouts.skipDay(days[0], 7000)).rejects.toThrow();
  });

  it('discards a draft with its sets but never a finished session', async () => {
    await workouts.recordSet(days[0], set(squat, 1, 80));
    const draft = (await workouts.getDay(days[0].id))!.session!;
    const skipped = await workouts.skipDay(days[1], 7000);

    await workouts.discardSession(draft.id);
    await workouts.discardSession(skipped);

    expect(await setLogs.getAll()).toEqual([]);
    expect((await sessions.getAll()).map((session) => session.id)).toEqual([skipped]);
  });

  it('returns the sets of the last other session with the same exercise name', async () => {
    await workouts.recordSet(days[1], set(squat, 1, 70, 100));
    await workouts.saveDay(days[1], [], 200, []);
    await workouts.recordSet(days[0], set(squat, 2, 77.5, 300));
    await workouts.recordSet(days[0], set(squat, 1, 75, 300));
    await workouts.saveDay(days[0], [], 400, []);

    await workouts.recordSet(days[0], set(squat, 1, 80, 500));
    const day = await workouts.getDay(days[0].id);

    expect(day?.exercises[0].previous.map((log) => [log.setNo, log.kg])).toEqual([
      [1, 75],
      [2, 77.5],
    ]);
    expect(day?.exercises[1].previous).toEqual([]);
  });

  it('follows the workout in progress', async () => {
    expect(await firstValueFrom(workouts.watchOpenSession())).toBeUndefined();
    await workouts.recordSet(days[0], set(squat, 1, 80));
    expect((await firstValueFrom(workouts.watchOpenSession()))?.day.csvGiorno).toBe('A');
  });

  it('returns undefined for a missing day', async () => {
    expect(await workouts.getDay(999)).toBeUndefined();
  });
});
