import { TestBed } from '@angular/core/testing';
import { useTestDatabase } from '../testing/test-database';
import { TrainingDayRepository } from './training-day.repository';

describe('TrainingDayRepository', () => {
  useTestDatabase();
  let repository: TrainingDayRepository;

  beforeEach(() => {
    repository = TestBed.inject(TrainingDayRepository);
  });

  it('returns the days of a phase in plan order', async () => {
    await repository.add({ phaseId: 1, label: 'Giorno 2', ordine: 2, csvGiorno: 'domenica' });
    await repository.add({ phaseId: 2, label: 'Giorno 1', ordine: 1, csvGiorno: 'lunedi' });
    await repository.add({ phaseId: 1, label: 'Giorno 1', ordine: 1, csvGiorno: 'sabato' });

    const days = await repository.getByPhase(1);

    expect(days.map((day) => day.label)).toEqual(['Giorno 1', 'Giorno 2']);
  });

  it('keeps the optional weekday', async () => {
    const id = await repository.add({
      phaseId: 1,
      label: 'Giorno 1',
      ordine: 1,
      csvGiorno: 'sabato',
      weekday: 6,
    });
    expect((await repository.getById(id))?.weekday).toBe(6);
  });
});
