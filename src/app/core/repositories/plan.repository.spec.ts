import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { NewPlan } from '../models';
import { newPlanExercise } from '../testing/fixtures';
import { useTestDatabase } from '../testing/test-database';
import { ExerciseRepository } from './exercise.repository';
import { PhaseRepository } from './phase.repository';
import { PlanRepository } from './plan.repository';

function newPlan(name: string, fase: number, importedAt = 1): NewPlan {
  const exercise = (dayKey: string, ordine: number, esercizio: string) =>
    newPlanExercise({ dayKey, ordine, esercizio });
  return {
    name,
    fase,
    importedAt,
    days: [
      { key: 'sabato', ordine: 1, csvGiorno: 'sabato', weekday: 6 },
      { key: 'mercoledi', ordine: 2, csvGiorno: 'mercoledi' },
    ],
    exercises: [
      exercise('sabato', 2, 'Rematore'),
      exercise('mercoledi', 1, 'Squat'),
      exercise('sabato', 1, 'Panca piana'),
    ],
  };
}

describe('PlanRepository', () => {
  useTestDatabase();
  let plans: PlanRepository;
  let phases: PhaseRepository;

  beforeEach(() => {
    plans = TestBed.inject(PlanRepository);
    phases = TestBed.inject(PhaseRepository);
  });

  it('stores a plan with its days and exercises linked and ordered', async () => {
    const id = await plans.savePlan(newPlan('Luglio', 7), true);

    const plan = await plans.getPlan(id);

    expect(plan?.phase).toMatchObject({ name: 'Luglio', fase: 7, status: 'active' });
    expect(plan?.days.map(({ day }) => [day.ordine, day.csvGiorno, day.weekday])).toEqual([
      [1, 'sabato', 6],
      [2, 'mercoledi', undefined],
    ]);
    expect(plan?.days[0].exercises.map((exercise) => exercise.esercizio)).toEqual([
      'Panca piana',
      'Rematore',
    ]);
    expect(plan?.days[1].exercises.every((exercise) => exercise.phaseId === id)).toBe(true);
  });

  it('archives the previous plan when a new one is activated, keeping both', async () => {
    const july = await plans.savePlan(newPlan('Luglio', 7), true);
    const pyramids = await plans.savePlan(newPlan('Piramidali', 8), true);

    expect((await phases.getById(july))?.status).toBe('archived');
    expect((await phases.getActive())?.id).toBe(pyramids);
    expect(await plans.getPlan(july)).toBeDefined();
  });

  it('can store a plan without activating it', async () => {
    const active = await plans.savePlan(newPlan('Luglio', 7), true);
    const stored = await plans.savePlan(newPlan('Bozza', 8), false);

    expect((await phases.getActive())?.id).toBe(active);
    expect((await phases.getById(stored))?.status).toBe('archived');
  });

  it('reactivates an archived plan, leaving exactly one active', async () => {
    const july = await plans.savePlan(newPlan('Luglio', 7), true);
    await plans.savePlan(newPlan('Piramidali', 8), true);

    await plans.activate(july);

    const all = await phases.getAll();
    expect(all.filter((phase) => phase.status === 'active').map((phase) => phase.id)).toEqual([
      july,
    ]);
  });

  it('rolls back the whole import when a write fails', async () => {
    await plans.savePlan(newPlan('Luglio', 7), true);
    const broken = newPlan('Rotta', 8);
    broken.exercises[0] = { ...broken.exercises[0], dayKey: 'inesistente' };

    await expect(plans.savePlan(broken, true)).rejects.toThrow();

    expect((await phases.getActive())?.name).toBe('Luglio');
    expect(await phases.getAll()).toHaveLength(1);
  });

  it('hides soft-deleted exercises from the plan', async () => {
    const id = await plans.savePlan(newPlan('Luglio', 7), true);
    const exercises = TestBed.inject(ExerciseRepository);
    const plan = await plans.getPlan(id);
    await exercises.update(plan!.days[0].exercises[0].id, { stato: 'rimosso' });

    expect((await plans.getPlan(id))?.days[0].exercises.map((e) => e.esercizio)).toEqual([
      'Rematore',
    ]);
  });

  it('lists summaries with the active plan first, then the newest', async () => {
    await plans.savePlan(newPlan('Vecchia', 5, 100), true);
    await plans.savePlan(newPlan('Recente', 6, 300), false);
    await plans.savePlan(newPlan('Attiva', 7, 200), true);

    const summaries = await firstValueFrom(plans.watchSummaries());

    expect(summaries.map((summary) => summary.phase.name)).toEqual([
      'Attiva',
      'Recente',
      'Vecchia',
    ]);
    expect(summaries[0]).toMatchObject({ dayCount: 2, exerciseCount: 3 });
  });

  it('finds plans by fase number', async () => {
    await plans.savePlan(newPlan('Luglio', 7), true);
    expect((await plans.findByFase(7)).map((phase) => phase.name)).toEqual(['Luglio']);
    expect(await plans.findByFase(9)).toEqual([]);
  });

  it('emits the active plan and follows activation changes', async () => {
    expect(await firstValueFrom(plans.watchActivePlan())).toBeUndefined();
    await plans.savePlan(newPlan('Luglio', 7), true);
    expect((await firstValueFrom(plans.watchActivePlan()))?.phase.name).toBe('Luglio');
  });
});
