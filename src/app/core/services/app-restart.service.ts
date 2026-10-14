import { Location } from '@angular/common';
import { DOCUMENT, Injectable, inject } from '@angular/core';

/**
 * Reloads the whole app at an in-app URL. Used after the data is replaced: every in-memory state
 * (typed but unsaved sets, a running rest, cached values) starts again from the database, instead
 * of each feature having to notice the change.
 */
@Injectable({ providedIn: 'root' })
export class AppRestartService {
  private readonly document = inject(DOCUMENT);
  private readonly location = inject(Location);

  /** `url` is an app route such as `/settings?restored=1`; the base href is added here. */
  restartAt(url: string): void {
    this.document.location.replace(this.location.prepareExternalUrl(url));
  }
}
