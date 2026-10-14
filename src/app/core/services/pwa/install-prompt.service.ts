import { DOCUMENT, Injectable, computed, inject, signal } from '@angular/core';
import { StoragePersistenceService } from '../storage-persistence.service';

/** The install prompt of Chromium browsers; not part of the TypeScript DOM library. */
export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * `standalone`: running as the installed app. `installed`: just installed from this browser tab.
 * `available`: the browser offers its install prompt. `ios`: Safari has no prompt, the user adds
 * the app to the home screen by hand. `manual`: from the browser menu, when there is no prompt.
 */
export type InstallState = 'standalone' | 'installed' | 'available' | 'ios' | 'manual';

/** Installation as an app: full screen, offline, and storage the browser does not evict. */
@Injectable({ providedIn: 'root' })
export class InstallPromptService {
  private readonly window = inject(DOCUMENT).defaultView;
  private readonly storage = inject(StoragePersistenceService);
  private readonly prompt = signal<BeforeInstallPromptEvent | null>(null);
  private readonly installedNow = signal(false);

  readonly state = computed<InstallState>(() => {
    if (this.isStandalone()) {
      return 'standalone';
    }
    if (this.installedNow()) {
      return 'installed';
    }
    if (this.prompt()) {
      return 'available';
    }
    return this.isIos() ? 'ios' : 'manual';
  });

  /** Called at startup: the browser fires its prompt event early, once per page load. */
  listen(): void {
    this.window?.addEventListener('beforeinstallprompt', (event) => {
      // Keep the prompt for the button in the settings instead of the browser's own banner.
      event.preventDefault();
      this.prompt.set(event as BeforeInstallPromptEvent);
    });
    this.window?.addEventListener('appinstalled', () => {
      this.prompt.set(null);
      this.installedNow.set(true);
      // Installed apps get persistent storage: ask again now instead of at the next start.
      void this.storage.ensurePersisted();
    });
  }

  async install(): Promise<void> {
    const event = this.prompt();
    if (!event) {
      return;
    }
    await event.prompt();
    const { outcome } = await event.userChoice;
    // A prompt can be shown only once.
    this.prompt.set(null);
    if (outcome === 'accepted') {
      this.installedNow.set(true);
    }
  }

  private isStandalone(): boolean {
    const navigator = this.window?.navigator as (Navigator & { standalone?: boolean }) | undefined;
    return (
      this.window?.matchMedia?.('(display-mode: standalone)').matches === true ||
      navigator?.standalone === true
    );
  }

  /** iPadOS reports itself as a Mac: a touch screen tells them apart. */
  private isIos(): boolean {
    const navigator = this.window?.navigator;
    if (!navigator) {
      return false;
    }
    return (
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1)
    );
  }
}
