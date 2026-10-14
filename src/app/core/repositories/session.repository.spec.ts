import { TestBed } from '@angular/core/testing';
import { useTestDatabase } from '../testing/test-database';
import { SessionRepository } from './session.repository';

describe('SessionRepository', () => {
  useTestDatabase();
  let repository: SessionRepository;

  beforeEach(() => {
    repository = TestBed.inject(SessionRepository);
  });

  it('returns the sessions of a phase, most recent first', async () => {
    await repository.add({ phaseId: 1, dayId: 1, startedAt: 100, endedAt: 200 });
    await repository.add({ phaseId: 1, dayId: 2, startedAt: 300 });
    await repository.add({ phaseId: 2, dayId: 1, startedAt: 400 });

    const sessions = await repository.getByPhase(1);

    expect(sessions.map((session) => session.startedAt)).toEqual([300, 100]);
  });
});
