import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { TrainingDay } from '../models';
import { newExerciseInput } from '../testing/fixtures';
import { useTestDatabase } from '../testing/test-database';
import { HistoryRepository } from './history.repository';
import { PlanEditorRepository } from './plan-editor.repository';
import { NewSet, WorkoutSessionRepository } from './workout-session.repository';

describe('HistoryRepository', () => {
  useTestDatabase();
  let history: HistoryRepository;
  let workouts: WorkoutSessionRepository;
  let editor: PlanEditorRepository;
  let dayA: TrainingDay;
  let dayB: TrainingDay;
  let squat: number;
  let bench: number;

  beforeEach(async () => {
    history = TestBed.inject(HistoryRepository);
    workouts = TestBed.inject(WorkoutSessionRepository);
    editor = TestBed.inject(PlanEditorRepository);
    const phaseId = await editor.createPlan({ name: 'Ottobre', fase: 3 }, true);
    const a = await editor.addDay(phaseId, { csvGiorno: 'Gambe' });
    const b = await editor.addDay(phaseId, { csvGiorno: 'Petto' });
    // Added in reverse: plan order must win over creation order.
    bench = await editor.addExercise(a, newExerciseInput({ esercizio: 'Panca piana' }));
    squat = await editor.addExercise(a, newExerciseInput({ esercizio: 'Squat' }));
    await editor.moveExercise(squat, -1);
    dayA = (await workouts.getDay(a))!.day;
    dayB = (await workouts.getDay(b))!.day;
  });

  function set(exerciseId: number, setNo: number, kg: number, date: number, fase = 3): NewSet {
    const esercizio = exerciseId === squat ? 'Squat' : 'Panca piana';
    return { exerciseId, esercizio, fase, date, setNo, kg, rip: 8, unitaCarico: 'totale' };
  }

  it('lists saved and skipped days, most recent first, without drafts', async () => {
    await workouts.saveDay(dayA, [set(squat, 1, 80, 100), set(bench, 1, 60, 100)], 200, []);
    await workouts.skipDay(dayB, 300);
    await workouts.recordSet(dayA, set(squat, 1, 85, 400));

    const sessions = await history.getSessions();

    expect(
      sessions.map((item) => [
        item.session.outcome,
        item.day?.csvGiorno,
        item.planName,
        item.setCount,
        item.exerciseCount,
      ]),
    ).toEqual([
      ['skipped', 'Petto', 'Ottobre', 0, 0],
      ['completed', 'Gambe', 'Ottobre', 2, 2],
    ]);
  });

  it('keeps sessions of a deleted day, without the day', async () => {
    await workouts.saveDay(dayB, [set(bench, 1, 60, 100)], 200, []);
    await editor.deleteDay(dayB.id);

    const [summary] = await history.getSessions();

    expect(summary.day).toBeUndefined();
    expect(summary.setCount).toBe(1);
  });

  it('returns a saved session with its sets grouped by exercise in plan order', async () => {
    const id = await workouts.saveDay(
      dayA,
      [set(bench, 1, 60, 100), set(squat, 2, 85, 100), set(squat, 1, 80, 100)],
      200,
      [],
    );

    const detail = await history.getSession(id);

    expect(detail?.planName).toBe('Ottobre');
    expect(
      detail?.exercises.map((item) => [item.esercizio, item.sets.map((log) => log.kg)]),
    ).toEqual([
      ['Squat', [80, 85]],
      ['Panca piana', [60]],
    ]);
  });

  it('lists the exercises left out of a saved session, with what replaced them', async () => {
    const hack = await editor.addExercise(dayB.id, newExerciseInput({ esercizio: 'Hack squat' }));
    await workouts.replaceExercise(dayA, { exerciseId: hack, replaces: squat }, 100);
    await workouts.closeExercise(dayA, { exerciseId: bench, outcome: 'skipped' }, 100);
    const hackSet = { ...set(squat, 1, 90, 100), exerciseId: hack, esercizio: 'Hack squat' };

    const id = await workouts.saveDay(dayA, [hackSet], 200, []);
    const detail = await history.getSession(id);

    expect(detail?.exercises.map(({ esercizio }) => esercizio)).toEqual(['Hack squat']);
    expect(detail?.skipped).toEqual([
      { esercizio: 'Squat', replacedBy: ['Hack squat'] },
      { esercizio: 'Panca piana', replacedBy: [] },
    ]);
  });

  it('does not show a workout still in progress', async () => {
    await workouts.recordSet(dayA, set(squat, 1, 80, 100));
    const draft = (await workouts.getDay(dayA.id))!.session!;

    expect(await history.getSession(draft.id)).toBeUndefined();
    expect(await history.getExercises()).toEqual([]);
  });

  it('lists exercise names alphabetically with sessions and last date', async () => {
    await workouts.saveDay(dayA, [set(squat, 1, 80, 100), set(bench, 1, 60, 100)], 150, []);
    await workouts.saveDay(dayA, [set(squat, 1, 82.5, 500)], 550, []);

    expect(await history.getExercises()).toEqual([
      { esercizio: 'Panca piana', sessionCount: 1, lastDate: 100 },
      { esercizio: 'Squat', sessionCount: 2, lastDate: 500 },
    ]);
  });

  it('returns the history of an exact name across plans, most recent first', async () => {
    await workouts.saveDay(dayA, [set(squat, 2, 85, 100), set(squat, 1, 80, 100)], 150, []);
    const next = await editor.createPlan({ name: 'Novembre', fase: 4 }, true);
    const day = await editor.addDay(next, { csvGiorno: 'Gambe' });
    const newSquat = await editor.addExercise(day, newExerciseInput({ esercizio: 'Squat' }));
    const nextDay = (await workouts.getDay(day))!.day;
    await workouts.saveDay(
      nextDay,
      [{ ...set(squat, 1, 90, 900, 4), exerciseId: newSquat }],
      950,
      [],
    );

    const sessions = await history.getExerciseHistory('Squat');

    expect(sessions.map((item) => [item.fase, item.date, item.sets.map((log) => log.kg)])).toEqual([
      [4, 900, [90]],
      [3, 100, [80, 85]],
    ]);
    expect(await history.getExerciseHistory('Squat bulgaro')).toEqual([]);
  });

  it('follows new sessions', async () => {
    expect(await firstValueFrom(history.watchSessions())).toEqual([]);
    await workouts.skipDay(dayA, 100);
    expect(await firstValueFrom(history.watchSessions())).toHaveLength(1);
  });
});
