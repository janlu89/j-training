import { Injectable, InjectionToken, inject, signal } from '@angular/core';

/** Subset of the StorageManager API used by the app; null when the browser does not expose it. */
export type PersistentStorage = Pick<StorageManager, 'persist' | 'persisted'>;

export const PERSISTENT_STORAGE = new InjectionToken<PersistentStorage | null>(
  'PERSISTENT_STORAGE',
  { providedIn: 'root', factory: () => globalThis.navigator?.storage ?? null },
);

/**
 * Asks the browser to keep IndexedDB data under storage pressure. Without it, an installed
 * PWA on Android may have its data evicted: the workout history only exists on the device.
 */
@Injectable({ providedIn: 'root' })
export class StoragePersistenceService {
  private readonly storage = inject(PERSISTENT_STORAGE);
  private readonly persistedState = signal<boolean | null>(null);

  /** null until checked; false when unsupported or denied by the browser. */
  readonly persisted = this.persistedState.asReadonly();

  async ensurePersisted(): Promise<boolean> {
    const granted = await this.requestPersistence();
    this.persistedState.set(granted);
    return granted;
  }

  private async requestPersistence(): Promise<boolean> {
    if (!this.storage) {
      return false;
    }
    try {
      return (await this.storage.persisted()) || (await this.storage.persist());
    } catch {
      return false;
    }
  }
}
