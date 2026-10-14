import { DOCUMENT } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SwUpdate, VersionEvent } from '@angular/service-worker';
import { Subject } from 'rxjs';
import { AppUpdateService } from './app-update.service';

describe('AppUpdateService', () => {
  let versionUpdates: Subject<VersionEvent>;
  let unrecoverable: Subject<{ type: 'UNRECOVERABLE_STATE'; reason: string }>;
  const checkForUpdate = vi.fn().mockResolvedValue(false);
  const activateUpdate = vi.fn().mockResolvedValue(true);
  const reload = vi.fn();
  let visibility: DocumentVisibilityState;

  function setUp(isEnabled: boolean): AppUpdateService {
    versionUpdates = new Subject();
    unrecoverable = new Subject();
    visibility = 'hidden';
    const listeners = new Map<string, () => void>();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: SwUpdate,
          useValue: { isEnabled, versionUpdates, unrecoverable, checkForUpdate, activateUpdate },
        },
        {
          provide: DOCUMENT,
          useValue: {
            location: { reload },
            get visibilityState() {
              return visibility;
            },
            addEventListener: (type: string, listener: () => void) => listeners.set(type, listener),
            dispatch: (type: string) => listeners.get(type)?.(),
          },
        },
      ],
    });
    const service = TestBed.inject(AppUpdateService);
    service.watch();
    return service;
  }

  const document = () => TestBed.inject(DOCUMENT) as unknown as { dispatch(type: string): void };

  beforeEach(() => {
    for (const mock of [checkForUpdate, activateUpdate, reload]) {
      mock.mockClear();
    }
  });

  it('tells when a new version is ready, then activates it and reloads on request', async () => {
    const service = setUp(true);
    expect(service.updateReady()).toBe(false);

    versionUpdates.next({ type: 'VERSION_DETECTED', version: { hash: 'b' } });
    expect(service.updateReady()).toBe(false);
    versionUpdates.next({
      type: 'VERSION_READY',
      currentVersion: { hash: 'a' },
      latestVersion: { hash: 'b' },
    });
    expect(service.updateReady()).toBe(true);

    await service.reload();
    expect(activateUpdate).toHaveBeenCalledOnce();
    expect(reload).toHaveBeenCalledOnce();
  });

  it('looks for a new version when the app comes back to the foreground', () => {
    setUp(true);

    document().dispatch('visibilitychange');
    expect(checkForUpdate).not.toHaveBeenCalled();
    visibility = 'visible';
    document().dispatch('visibilitychange');
    expect(checkForUpdate).toHaveBeenCalledOnce();
  });

  it('reloads from the network when the cached version is broken', () => {
    setUp(true);

    unrecoverable.next({ type: 'UNRECOVERABLE_STATE', reason: 'missing file' });

    expect(reload).toHaveBeenCalledOnce();
  });

  it('does nothing without a service worker', () => {
    const service = setUp(false);
    visibility = 'visible';

    document().dispatch('visibilitychange');

    expect(checkForUpdate).not.toHaveBeenCalled();
    expect(service.updateReady()).toBe(false);
  });
});
