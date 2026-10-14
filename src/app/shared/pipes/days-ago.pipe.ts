import { Pipe, PipeTransform } from '@angular/core';
import { EpochMs } from '../../core/models';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * How long ago a past day was, in the UI language: "oggi", "ieri", "3 giorni fa", then weeks,
 * months and years. Counted in calendar days, so yesterday evening is "ieri" this morning.
 */
export function formatDaysAgo(at: EpochMs, now: EpochMs, language: string): string {
  const days = calendarDaysBetween(at, now);
  const format = new Intl.RelativeTimeFormat(language, { numeric: 'auto' });
  if (days < 7) {
    return format.format(-days, 'day');
  }
  if (days < 30) {
    return format.format(-Math.floor(days / 7), 'week');
  }
  if (days < 365) {
    return format.format(-Math.floor(days / 30), 'month');
  }
  return format.format(-Math.floor(days / 365), 'year');
}

function calendarDaysBetween(from: EpochMs, to: EpochMs): number {
  const day = (at: EpochMs) => {
    const date = new Date(at);
    return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  };
  return Math.max(0, Math.round((day(to) - day(from)) / DAY_MS));
}

/** `now` and the language are arguments, so the pure pipe re-runs when they change. */
@Pipe({ name: 'daysAgo' })
export class DaysAgoPipe implements PipeTransform {
  transform(value: EpochMs, now: EpochMs, language: string): string {
    return formatDaysAgo(value, now, language);
  }
}
