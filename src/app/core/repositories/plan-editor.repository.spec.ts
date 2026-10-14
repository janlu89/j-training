import { TestBed } from '@angular/core/testing';
import { ExerciseInput } from '../models';
import { newExerciseInput, newPlanExercise } from '../testing/fixtures';
import { useTestDatabase } from '../testing/test-database';
import { ExerciseRepository } from './exercise.repository';
import { PhaseRepository } from './phase.repository';
import { PlanEditorRepository } from './plan-editor.repository';
import { PlanRepository } from './plan.repository';
import { SessionRepository } from './session.repository';

const exerciseInput = (esercizio: string): ExerciseInput => newExerciseInput({ esercizio });

describe('PlanEditorRepository', () => {
  useTestDatabase();
  let editor: PlanEditorRepository;
  let plans: PlanRepository;

  beforeEach(() => {
    editor = TestBed.inject(PlanEditorRepository);
    plans = TestBed.inject(PlanRepository);
  });

  async function planWithDays(...names: string[]): Promise<{ phaseId: number; dayIds: number[] }> {
    const phaseId = await editor.createPlan({ name: 'Mia scheda', fase: 1 }, true);
    const dayIds: number[] = [];
    for (const csvGiorno of names) {
      dayIds.push(await editor.addDay(phaseId, { csvGiorno }));
    }
    return { phaseId, dayIds };
  }

  async function names(phaseId: number, dayIndex = 0): Promise<string[]> {
    const plan = await plans.getPlan(phaseId);
    return plan!.days[dayIndex].exercises.map((exercise) => exercise.esercizio);
  }

  it('creates an empty plan, archiving the active one when asked', async () => {
    const first = await editor.createPlan({ name: 'Prima', fase: 1 }, true);
    const second = await editor.createPlan({ name: 'Seconda', fase: 2 }, true);
    const draft = await editor.createPlan({ name: 'Bozza', fase: 3 }, false);

    const phases = TestBed.inject(PhaseRepository);
    expect((await phases.getActive())?.id).toBe(second);
    expect((await phases.getById(first))?.status).toBe('archived');
    expect((await phases.getById(draft))?.status).toBe('archived');
    expect((await plans.getPlan(second))?.days).toEqual([]);
  });

  it('renames a plan', async () => {
    const { phaseId } = await planWithDays();
    await editor.updatePlan(phaseId, { name: 'Ottobre', fase: 4 });
    expect((await plans.getPlan(phaseId))?.phase).toMatchObject({ name: 'Ottobre', fase: 4 });
  });

  it('appends days in order and updates them', async () => {
    const { phaseId, dayIds } = await planWithDays('Petto', 'Gambe');
    await editor.updateDay(dayIds[1], { csvGiorno: 'Gambe e glutei', weekday: 4 });

    const days = (await plans.getPlan(phaseId))!.days.map(({ day }) => day);
    expect(days.map((day) => [day.ordine, day.csvGiorno, day.weekday])).toEqual([
      [1, 'Petto', undefined],
      [2, 'Gambe e glutei', 4],
    ]);
  });

  it('changes only the given field of a day', async () => {
    const { phaseId, dayIds } = await planWithDays('Gambe');
    // The page still holds the day as it was before the rename.
    await editor.updateDay(dayIds[0], { csvGiorno: 'Gambe e glutei' });
    await editor.updateDay(dayIds[0], { weekday: 4 });

    const [{ day }] = (await plans.getPlan(phaseId))!.days;
    expect([day.csvGiorno, day.weekday]).toEqual(['Gambe e glutei', 4]);

    await editor.updateDay(dayIds[0], { weekday: undefined });
    const [{ day: cleared }] = (await plans.getPlan(phaseId))!.days;
    expect([cleared.csvGiorno, cleared.weekday]).toEqual(['Gambe e glutei', undefined]);
  });

  it('moves days up and down, ignoring moves past the ends', async () => {
    const { phaseId, dayIds } = await planWithDays('A', 'B', 'C');

    await editor.moveDay(dayIds[2], -1);
    await editor.moveDay(dayIds[0], -1);

    const order = (await plans.getPlan(phaseId))!.days.map(({ day }) => day.csvGiorno);
    expect(order).toEqual(['A', 'C', 'B']);
  });

  it('deletes a day with its exercises', async () => {
    const { phaseId, dayIds } = await planWithDays('A', 'B');
    await editor.addExercise(dayIds[0], exerciseInput('Squat'));

    await editor.deleteDay(dayIds[0]);

    const plan = await plans.getPlan(phaseId);
    expect(plan?.days.map(({ day }) => day.csvGiorno)).toEqual(['B']);
    expect(await TestBed.inject(ExerciseRepository).getAll()).toEqual([]);
  });

  it('keeps a workout in progress on a deleted day as a completed session', async () => {
    const { dayIds } = await planWithDays('A');
    const sessions = TestBed.inject(SessionRepository);
    const id = await sessions.add({ phaseId: 1, dayId: dayIds[0], startedAt: 1 });

    await editor.deleteDay(dayIds[0]);

    expect(await sessions.getById(id)).toMatchObject({ outcome: 'completed' });
    expect((await sessions.getById(id))?.endedAt).toBeGreaterThan(0);
  });

  it('adds manual exercises at the end of the day', async () => {
    const { phaseId, dayIds } = await planWithDays('A');
    await editor.addExercise(dayIds[0], exerciseInput('Squat'));
    await editor.addExercise(dayIds[0], exerciseInput('Panca'));

    const exercises = (await plans.getPlan(phaseId))!.days[0].exercises;
    expect(exercises.map((e) => [e.esercizio, e.ordine, e.isManual, e.phaseId])).toEqual([
      ['Squat', 1, true, phaseId],
      ['Panca', 2, true, phaseId],
    ]);
  });

  it('updates an exercise and moves it to the end of another day', async () => {
    const { phaseId, dayIds } = await planWithDays('A', 'B');
    const squat = await editor.addExercise(dayIds[0], exerciseInput('Squat'));
    await editor.addExercise(dayIds[1], exerciseInput('Panca'));

    await editor.updateExercise(
      squat,
      { ...exerciseInput('Squat'), posizione: 'rack 5', recSec: 180 },
      dayIds[1],
    );

    const plan = await plans.getPlan(phaseId);
    expect(plan?.days[0].exercises).toEqual([]);
    expect(
      plan?.days[1].exercises.map((e) => [e.esercizio, e.ordine, e.posizione, e.recSec]),
    ).toEqual([
      ['Panca', 1, '', 120],
      ['Squat', 2, 'rack 5', 180],
    ]);
  });

  it('reorders exercises even when imported rows share the same position', async () => {
    const id = await plans.savePlan(
      {
        name: 'Import',
        fase: 1,
        importedAt: 1,
        days: [{ key: 'a', ordine: 1, csvGiorno: 'A' }],
        exercises: [
          newPlanExercise({ dayKey: 'a', ordine: 1, esercizio: 'Uno' }),
          newPlanExercise({ dayKey: 'a', ordine: 1, esercizio: 'Due' }),
          newPlanExercise({ dayKey: 'a', ordine: 2, esercizio: 'Tre' }),
        ],
      },
      true,
    );
    const due = (await plans.getPlan(id))!.days[0].exercises[1].id;

    await editor.moveExercise(due, -1);

    expect(await names(id)).toEqual(['Due', 'Uno', 'Tre']);
  });

  it('soft-deletes an exercise and skips it when reordering', async () => {
    const { phaseId, dayIds } = await planWithDays('A');
    await editor.addExercise(dayIds[0], exerciseInput('Uno'));
    const due = await editor.addExercise(dayIds[0], exerciseInput('Due'));
    const tre = await editor.addExercise(dayIds[0], exerciseInput('Tre'));

    await editor.removeExercise(due);
    await editor.moveExercise(tre, -1);

    expect(await names(phaseId)).toEqual(['Tre', 'Uno']);
  });

  it('deletes a plan without workouts, everything included', async () => {
    const { phaseId, dayIds } = await planWithDays('A');
    await editor.addExercise(dayIds[0], exerciseInput('Squat'));

    expect(await editor.deletePlan(phaseId)).toBe('deleted');
    expect(await plans.getPlan(phaseId)).toBeUndefined();
  });

  it('refuses to delete a plan with recorded workouts', async () => {
    const { phaseId, dayIds } = await planWithDays('A');
    await TestBed.inject(SessionRepository).add({ phaseId, dayId: dayIds[0], startedAt: 1 });

    expect(await editor.deletePlan(phaseId)).toBe('hasSessions');
    expect(await plans.getPlan(phaseId)).toBeDefined();
  });
});
