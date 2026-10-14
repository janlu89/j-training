import { TestBed } from '@angular/core/testing';
import {
  PERSISTENT_STORAGE,
  PersistentStorage,
  StoragePersistenceService,
} from './storage-persistence.service';

describe('StoragePersistenceService', () => {
  function setup(storage: PersistentStorage | null): StoragePersistenceService {
    TestBed.configureTestingModule({
      providers: [{ provide: PERSISTENT_STORAGE, useValue: storage }],
    });
    return TestBed.inject(StoragePersistenceService);
  }

  function fakeStorage(persisted: boolean, grant: boolean) {
    return {
      persisted: vi.fn().mockResolvedValue(persisted),
      persist: vi.fn().mockResolvedValue(grant),
    };
  }

  it('is unknown until checked', () => {
    expect(setup(fakeStorage(true, true)).persisted()).toBeNull();
  });

  it('does not ask again when storage is already persistent', async () => {
    const storage = fakeStorage(true, false);
    const service = setup(storage);

    expect(await service.ensurePersisted()).toBe(true);
    expect(storage.persist).not.toHaveBeenCalled();
    expect(service.persisted()).toBe(true);
  });

  it('requests persistence and reports the browser answer', async () => {
    const storage = fakeStorage(false, true);
    const service = setup(storage);

    expect(await service.ensurePersisted()).toBe(true);
    expect(storage.persist).toHaveBeenCalledOnce();
  });

  it('reports false when the browser denies it', async () => {
    const service = setup(fakeStorage(false, false));
    expect(await service.ensurePersisted()).toBe(false);
    expect(service.persisted()).toBe(false);
  });

  it('reports false when the Storage API is unavailable', async () => {
    expect(await setup(null).ensurePersisted()).toBe(false);
  });

  it('reports false when the Storage API throws', async () => {
    const storage = {
      persisted: vi.fn().mockRejectedValue(new Error('denied')),
      persist: vi.fn(),
    };
    expect(await setup(storage).ensurePersisted()).toBe(false);
  });
});
