import { Pipe, PipeTransform } from '@angular/core';
import { EpochMs } from '../../core/models';

/**
 * Formats a timestamp as a short date in the given UI language ("14/10/2026", "10/14/2026").
 * The language is an argument, so the pure pipe re-runs when it changes.
 */
@Pipe({ name: 'localDate' })
export class LocalDatePipe implements PipeTransform {
  transform(value: EpochMs, language: string): string {
    return new Intl.DateTimeFormat(language, { dateStyle: 'short' }).format(value);
  }
}
