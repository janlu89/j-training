import { PlanDay, Weekday } from '../models';

/**
 * Why a day is proposed for today:
 * - `today`: the day is assigned to the current weekday;
 * - `restDay`: weekdays are assigned but none is today, the next scheduled day is proposed;
 * - `rotation`: no weekday applies, the day after the last session (or the first) is proposed.
 */
export type SuggestionReason = 'today' | 'restDay' | 'rotation';

export interface DaySuggestion {
  reason: SuggestionReason;
  day: PlanDay;
}

/** ISO weekday of a date: Monday = 1 … Sunday = 7. */
export function isoWeekday(date: Date): Weekday {
  return (((date.getDay() + 6) % 7) + 1) as Weekday;
}

/** Proposes the training day for today. Pure: the caller provides today and the last session. */
export function suggestDay(
  days: readonly PlanDay[],
  today: Weekday,
  lastSessionDayId?: number,
): DaySuggestion | undefined {
  if (!days.length) {
    return undefined;
  }
  const scheduled = days.filter(({ day }) => day.weekday !== undefined);
  const todays = scheduled.find(({ day }) => day.weekday === today);
  if (todays) {
    return { reason: 'today', day: todays };
  }
  if (scheduled.length) {
    return { reason: 'restDay', day: nextScheduled(scheduled, today) };
  }
  return { reason: 'rotation', day: nextInRotation(days, lastSessionDayId) };
}

/** The first scheduled day after today, wrapping around the week. */
function nextScheduled(scheduled: readonly PlanDay[], today: Weekday): PlanDay {
  const distance = ({ day }: PlanDay) => ((day.weekday ?? today) - today + 7) % 7;
  return [...scheduled].sort((a, b) => distance(a) - distance(b))[0];
}

function nextInRotation(days: readonly PlanDay[], lastSessionDayId?: number): PlanDay {
  const lastIndex = days.findIndex(({ day }) => day.id === lastSessionDayId);
  return days[(lastIndex + 1) % days.length];
}
