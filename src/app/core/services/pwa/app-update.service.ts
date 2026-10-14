import { DOCUMENT, Injectable, inject, signal } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';
import { filter } from 'rxjs';

/**
 * New versions published while the app is open. The service worker downloads them in the
 * background; the user chooses when to reload, so a workout being typed in is never interrupted.
 */
@Injectable({ providedIn: 'root' })
export class AppUpdateService {
  private readonly updates = inject(SwUpdate);
  private readonly document = inject(DOCUMENT);
  private readonly ready = signal(false);

  /** True once a new version is downloaded and ready to use. */
  readonly updateReady = this.ready.asReadonly();

  /** Called once at startup; does nothing without a service worker (development, old browsers). */
  watch(): void {
    if (!this.updates.isEnabled) {
      return;
    }
    this.updates.versionUpdates
      .pipe(filter((event) => event.type === 'VERSION_READY'))
      .subscribe(() => this.ready.set(true));
    // The cached version can no longer be served: only a reload from the network fixes it.
    this.updates.unrecoverable.subscribe(() => this.document.location.reload());
    // An installed app can stay open for days: look for a new version when it comes back.
    this.document.addEventListener('visibilitychange', () => {
      if (this.document.visibilityState === 'visible') {
        this.updates.checkForUpdate().catch(() => false);
      }
    });
  }

  async reload(): Promise<void> {
    await this.updates.activateUpdate();
    this.document.location.reload();
  }
}
