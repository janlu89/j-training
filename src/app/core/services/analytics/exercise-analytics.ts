import { EpochMs, ExerciseSession } from '../../models';

/** The heaviest load lifted for a given number of reps in one session. */
export interface ProgressionPoint {
  sessionId: number;
  date: EpochMs;
  kg: number;
}

/** Total reps of an exercise in one week, which starts on Monday. */
export interface WeekReps {
  weekStart: EpochMs;
  reps: number;
}

/** Rep counts recorded for the exercise, most frequent first; ties go to the lower count. */
export function repCounts(sessions: readonly ExerciseSession[]): number[] {
  const frequency = new Map<number, number>();
  for (const { sets } of sessions) {
    for (const { rip } of sets) {
      frequency.set(rip, (frequency.get(rip) ?? 0) + 1);
    }
  }
  return [...frequency].sort((a, b) => b[1] - a[1] || a[0] - b[0]).map(([rip]) => rip);
}

/**
 * Load progression at equal reps: for each session, oldest first, the heaviest set done with
 * exactly `reps` reps. Sessions without such a set are left out rather than drawn as zero.
 */
export function loadProgression(
  sessions: readonly ExerciseSession[],
  reps: number,
): ProgressionPoint[] {
  return [...sessions]
    .sort((a, b) => a.date - b.date)
    .flatMap(({ sessionId, date, sets }) => {
      const loads = sets.filter((set) => set.rip === reps).map((set) => set.kg);
      return loads.length ? [{ sessionId, date, kg: Math.max(...loads) }] : [];
    });
}

/**
 * Total reps per week for the `weeks` weeks ending with the one that contains `today`, oldest
 * first. Weeks without training are included with 0, so the time axis stays honest.
 */
export function weeklyReps(
  sessions: readonly ExerciseSession[],
  today: EpochMs,
  weeks: number,
): WeekReps[] {
  const last = startOfWeek(today);
  const starts = Array.from({ length: weeks }, (_, index) =>
    addDays(last, (index - weeks + 1) * 7),
  );
  const totals = new Map(starts.map((start) => [start, 0]));
  for (const { sets } of sessions) {
    for (const set of sets) {
      const week = startOfWeek(set.date);
      if (totals.has(week)) {
        totals.set(week, (totals.get(week) ?? 0) + set.rip);
      }
    }
  }
  return starts.map((weekStart) => ({ weekStart, reps: totals.get(weekStart) ?? 0 }));
}

/** Monday 00:00 local time of the week containing `date`. */
export function startOfWeek(date: EpochMs): EpochMs {
  const day = new Date(date);
  const sinceMonday = (day.getDay() + 6) % 7;
  return new Date(day.getFullYear(), day.getMonth(), day.getDate() - sinceMonday).getTime();
}

/** Calendar arithmetic, so a daylight saving change never shifts a week boundary. */
function addDays(date: EpochMs, days: number): EpochMs {
  const day = new Date(date);
  return new Date(day.getFullYear(), day.getMonth(), day.getDate() + days).getTime();
}
