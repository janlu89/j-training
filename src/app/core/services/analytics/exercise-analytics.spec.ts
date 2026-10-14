import { ExerciseSession } from '../../models';
import { newSetLog } from '../../testing/fixtures';
import { loadProgression, repCounts, startOfWeek, weeklyReps } from './exercise-analytics';

const day = (iso: string) => new Date(`${iso}T18:00:00`).getTime();

function session(
  sessionId: number,
  date: number,
  sets: [kg: number, rip: number][],
): ExerciseSession {
  return {
    sessionId,
    date,
    fase: 1,
    unitaCarico: 'totale',
    sets: sets.map(([kg, rip], index) => ({
      id: sessionId * 10 + index,
      ...newSetLog({ sessionId, date, setNo: index + 1, kg, rip }),
    })),
  };
}

// Most recent first, as the history repository returns them.
const SESSIONS = [
  session(3, day('2026-10-14'), [
    [85, 8],
    [85, 8],
    [90, 6],
  ]),
  session(2, day('2026-10-07'), [
    [82.5, 8],
    [80, 8],
  ]),
  session(1, day('2026-09-30'), [
    [80, 8],
    [70, 10],
  ]),
];

describe('repCounts', () => {
  it('lists rep counts by frequency, ties to the lower count', () => {
    expect(repCounts(SESSIONS)).toEqual([8, 6, 10]);
    expect(repCounts([])).toEqual([]);
  });
});

describe('loadProgression', () => {
  it('keeps the heaviest set at the chosen reps per session, oldest first', () => {
    expect(loadProgression(SESSIONS, 8).map((point) => [point.sessionId, point.kg])).toEqual([
      [1, 80],
      [2, 82.5],
      [3, 85],
    ]);
  });

  it('leaves out sessions without a set at those reps', () => {
    expect(loadProgression(SESSIONS, 6).map((point) => point.sessionId)).toEqual([3]);
  });
});

describe('weeklyReps', () => {
  it('sums reps per week, Monday to Sunday, including empty weeks', () => {
    const weeks = weeklyReps(SESSIONS, day('2026-10-16'), 4);
    expect(weeks.map((week) => [new Date(week.weekStart).getDate(), week.reps])).toEqual([
      [21, 0],
      [28, 18],
      [5, 16],
      [12, 22],
    ]);
  });

  it('ignores sets older than the window', () => {
    expect(weeklyReps(SESSIONS, day('2026-10-16'), 1)).toEqual([
      { weekStart: startOfWeek(day('2026-10-16')), reps: 22 },
    ]);
  });
});

describe('startOfWeek', () => {
  it('goes back to Monday midnight, also from Sunday', () => {
    expect(startOfWeek(day('2026-10-18'))).toBe(new Date(2026, 9, 12).getTime());
    expect(startOfWeek(day('2026-10-12'))).toBe(new Date(2026, 9, 12).getTime());
  });
});
