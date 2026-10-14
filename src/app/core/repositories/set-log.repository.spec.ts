import { TestBed } from '@angular/core/testing';
import { newSetLog } from '../testing/fixtures';
import { useTestDatabase } from '../testing/test-database';
import { SetLogRepository } from './set-log.repository';

describe('SetLogRepository', () => {
  useTestDatabase();
  let repository: SetLogRepository;

  beforeEach(() => {
    repository = TestBed.inject(SetLogRepository);
  });

  it('returns the history of an exact exercise name across phases, oldest first', async () => {
    await repository.add(newSetLog({ fase: 2, date: 300, kg: 65 }));
    await repository.add(newSetLog({ fase: 1, date: 100, kg: 60 }));
    await repository.add(newSetLog({ esercizio: 'Panca piana leggera', date: 200, kg: 40 }));

    const history = await repository.getByExerciseName('Panca piana');

    expect(history.map((log) => [log.fase, log.kg])).toEqual([
      [1, 60],
      [2, 65],
    ]);
  });

  it('returns the sets of a session', async () => {
    await repository.add(newSetLog({ sessionId: 1, setNo: 1 }));
    await repository.add(newSetLog({ sessionId: 1, setNo: 2 }));
    await repository.add(newSetLog({ sessionId: 2, setNo: 1 }));

    expect(await repository.getBySession(1)).toHaveLength(2);
  });
});
