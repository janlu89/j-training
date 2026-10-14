import { InjectionToken } from '@angular/core';

/** Current time as epoch ms. A token, so tests can freeze "today". */
export const CLOCK = new InjectionToken<() => number>('CLOCK', {
  providedIn: 'root',
  factory: () => () => Date.now(),
});
