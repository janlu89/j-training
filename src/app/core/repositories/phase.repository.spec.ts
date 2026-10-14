import { TestBed } from '@angular/core/testing';
import { firstValueFrom, skip } from 'rxjs';
import { useTestDatabase } from '../testing/test-database';
import { PhaseRepository } from './phase.repository';

describe('PhaseRepository', () => {
  useTestDatabase();
  let repository: PhaseRepository;

  beforeEach(() => {
    repository = TestBed.inject(PhaseRepository);
  });

  it('adds a phase and reads it back by id', async () => {
    const id = await repository.add({ name: 'Scheda', fase: 1, status: 'active', importedAt: 1 });
    expect(await repository.getById(id)).toEqual({
      id,
      name: 'Scheda',
      fase: 1,
      status: 'active',
      importedAt: 1,
    });
  });

  it('returns the active phase, ignoring archived ones', async () => {
    await repository.add({ name: 'Scheda', fase: 1, status: 'archived', importedAt: 1 });
    const activeId = await repository.add({
      name: 'Scheda',
      fase: 2,
      status: 'active',
      importedAt: 2,
    });
    expect((await repository.getActive())?.id).toBe(activeId);
  });

  it('returns undefined when there is no active phase', async () => {
    expect(await repository.getActive()).toBeUndefined();
  });

  it('updates an existing phase and reports missing ids', async () => {
    const id = await repository.add({ name: 'Scheda', fase: 1, status: 'active', importedAt: 1 });
    expect(await repository.update(id, { status: 'archived' })).toBe(true);
    expect((await repository.getById(id))?.status).toBe('archived');
    expect(await repository.update(999, { status: 'archived' })).toBe(false);
  });

  it('re-emits the active phase when data changes', async () => {
    const changes = repository.watchActive();
    const next = firstValueFrom(changes.pipe(skip(1)));
    await firstValueFrom(changes);
    await repository.add({ name: 'Scheda', fase: 3, status: 'active', importedAt: 3 });
    expect((await next)?.fase).toBe(3);
  });
});
