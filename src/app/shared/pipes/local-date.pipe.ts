import { Pipe, PipeTransform } from '@angular/core';
import { EpochMs } from '../../core/models';

/** `short`: "14/10/26"; `weekday`: "mer 14 ott 2026", for dates the user scans in a list. */
export type LocalDateStyle = 'short' | 'weekday';

const FORMATS: Record<LocalDateStyle, Intl.DateTimeFormatOptions> = {
  short: { dateStyle: 'short' },
  weekday: { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' },
};

/** Formats a timestamp as a date in the given UI language, also outside templates. */
export function formatLocalDate(
  value: EpochMs,
  language: string,
  style: LocalDateStyle = 'short',
): string {
  return new Intl.DateTimeFormat(language, FORMATS[style]).format(value);
}

/** The language is an argument, so the pure pipe re-runs when it changes. */
@Pipe({ name: 'localDate' })
export class LocalDatePipe implements PipeTransform {
  transform(value: EpochMs, language: string, style: LocalDateStyle = 'short'): string {
    return formatLocalDate(value, language, style);
  }
}
