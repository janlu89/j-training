import { DOCUMENT } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ScreenWakeLock, WAKE_LOCK } from './screen-wake-lock';

function sentinel(): WakeLockSentinel {
  const lock = { released: false, release: vi.fn() };
  lock.release.mockImplementation(async () => {
    lock.released = true;
  });
  return lock as unknown as WakeLockSentinel;
}

describe('ScreenWakeLock', () => {
  function setup(request: ReturnType<typeof vi.fn> | null): ScreenWakeLock {
    TestBed.configureTestingModule({
      providers: [{ provide: WAKE_LOCK, useValue: request && { request } }],
    });
    return TestBed.inject(ScreenWakeLock);
  }

  function setVisibility(state: DocumentVisibilityState): void {
    const document = TestBed.inject(DOCUMENT);
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue(state);
    document.dispatchEvent(new Event('visibilitychange'));
  }

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('keeps the screen on until released', async () => {
    const lock = sentinel();
    const request = vi.fn().mockResolvedValue(lock);
    const wakeLock = setup(request);

    await wakeLock.acquire();
    await wakeLock.acquire();
    await wakeLock.release();

    expect(request).toHaveBeenCalledOnce();
    expect(request).toHaveBeenCalledWith('screen');
    expect(lock.release).toHaveBeenCalledOnce();
  });

  it('takes the lock again when the page comes back, only while it is wanted', async () => {
    const first = sentinel();
    const request = vi.fn().mockResolvedValueOnce(first).mockResolvedValue(sentinel());
    const wakeLock = setup(request);
    await wakeLock.acquire();

    // The browser releases the lock when the page is hidden.
    await first.release();
    setVisibility('visible');
    await vi.waitFor(() => expect(request).toHaveBeenCalledTimes(2));

    await wakeLock.release();
    setVisibility('visible');
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('works without the API or when the browser refuses', async () => {
    await expect(setup(null).acquire()).resolves.toBeUndefined();
    TestBed.resetTestingModule();
    const refusing = setup(vi.fn().mockRejectedValue(new Error('NotAllowedError')));
    await expect(refusing.acquire()).resolves.toBeUndefined();
    await expect(refusing.release()).resolves.toBeUndefined();
  });
});
