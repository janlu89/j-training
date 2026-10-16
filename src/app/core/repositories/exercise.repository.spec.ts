import { TestBed } from '@angular/core/testing';
import { newExercise } from '../testing/fixtures';
import { useTestDatabase } from '../testing/test-database';
import { ExerciseRepository } from './exercise.repository';
import { PhaseRepository } from './phase.repository';

describe('ExerciseRepository', () => {
  useTestDatabase();
  let repository: ExerciseRepository;

  beforeEach(() => {
    repository = TestBed.inject(ExerciseRepository);
  });

  it('returns the exercises of a day in plan order', async () => {
    await repository.add(newExercise({ esercizio: 'Rematore', ordine: 2 }));
    await repository.add(newExercise({ esercizio: 'Squat', dayId: 2, ordine: 1 }));
    await repository.add(newExercise({ esercizio: 'Panca piana', ordine: 1 }));

    const exercises = await repository.getVisibleByDay(1);

    expect(exercises.map((exercise) => exercise.esercizio)).toEqual(['Panca piana', 'Rematore']);
  });

  it('hides soft-deleted exercises but keeps them in the database', async () => {
    await repository.add(newExercise({ esercizio: 'Panca piana', ordine: 1 }));
    const removedId = await repository.add(
      newExercise({ esercizio: 'Croci', ordine: 2, stato: 'rimosso' }),
    );

    const visible = await repository.getVisibleByDay(1);

    expect(visible.map((exercise) => exercise.esercizio)).toEqual(['Panca piana']);
    expect(await repository.getById(removedId)).toBeDefined();
  });

  it('offers one exercise per name across plans: the active plan first, else the newest', async () => {
    const phases = TestBed.inject(PhaseRepository);
    const july = await phases.add({ name: 'Luglio', fase: 7, status: 'archived', importedAt: 1 });
    const august = await phases.add({ name: 'Agosto', fase: 8, status: 'archived', importedAt: 2 });
    const active = await phases.add({ name: 'Ottobre', fase: 9, status: 'active', importedAt: 0 });
    await repository.add(newExercise({ phaseId: july, esercizio: 'Squat' }));
    const squat = await repository.add(newExercise({ phaseId: active, esercizio: 'Squat' }));
    await repository.add(newExercise({ phaseId: august, esercizio: 'Squat' }));
    await repository.add(newExercise({ phaseId: july, esercizio: 'Hack squat' }));
    const hack = await repository.add(newExercise({ phaseId: august, esercizio: 'Hack squat' }));
    const lunges = await repository.add(newExercise({ phaseId: july, esercizio: 'Affondi' }));

    const choices = await repository.getChoices();

    expect(choices.map(({ esercizio, id }) => [esercizio, id])).toEqual([
      ['Affondi', lunges],
      ['Hack squat', hack],
      ['Squat', squat],
    ]);
  });

  it('keeps exercises with no recorded load', async () => {
    const id = await repository.add(newExercise({ ultimoKg: null, stato: 'da_testare' }));
    expect((await repository.getById(id))?.ultimoKg).toBeNull();
  });
});
