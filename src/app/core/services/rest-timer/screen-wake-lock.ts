import { DOCUMENT, Injectable, InjectionToken, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { fromEvent } from 'rxjs';

/** The Screen Wake Lock API; null where the browser does not offer it. */
export type WakeLockApi = Pick<WakeLock, 'request'>;

export const WAKE_LOCK = new InjectionToken<WakeLockApi | null>('WAKE_LOCK', {
  providedIn: 'root',
  factory: () => globalThis.navigator?.wakeLock ?? null,
});

/**
 * Keeps the screen on while a rest is running, so the phone does not lock between sets. The
 * browser drops the lock when the page is hidden: it is taken again when the page comes back.
 * A refusal (battery saver, unsupported browser) is not an error: the timer works anyway.
 */
@Injectable({ providedIn: 'root' })
export class ScreenWakeLock {
  private readonly api = inject(WAKE_LOCK);
  private readonly document = inject(DOCUMENT);
  private sentinel: WakeLockSentinel | null = null;
  private wanted = false;

  constructor() {
    fromEvent(this.document, 'visibilitychange')
      .pipe(takeUntilDestroyed())
      .subscribe(() => {
        if (this.wanted && this.document.visibilityState === 'visible') {
          void this.request();
        }
      });
  }

  async acquire(): Promise<void> {
    this.wanted = true;
    await this.request();
  }

  async release(): Promise<void> {
    this.wanted = false;
    const sentinel = this.sentinel;
    this.sentinel = null;
    await sentinel?.release().catch(() => undefined);
  }

  private async request(): Promise<void> {
    if (!this.api || (this.sentinel && !this.sentinel.released)) {
      return;
    }
    try {
      this.sentinel = await this.api.request('screen');
    } catch {
      this.sentinel = null;
    }
  }
}
