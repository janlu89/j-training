import { PlanDay, Weekday } from '../models';
import { isoWeekday, suggestDay } from './day-suggestion';

function planDay(id: number, weekday?: Weekday): PlanDay {
  return {
    day: { id, phaseId: 1, ordine: id, csvGiorno: `giorno ${id}`, ...(weekday ? { weekday } : {}) },
    exercises: [],
  };
}

describe('isoWeekday', () => {
  it.each([
    ['2026-10-12', 1],
    ['2026-10-14', 3],
    ['2026-10-17', 6],
    ['2026-10-18', 7],
  ])('%s is weekday %i', (date, weekday) => {
    expect(isoWeekday(new Date(`${date}T12:00:00`))).toBe(weekday);
  });
});

describe('suggestDay', () => {
  const SATURDAY: Weekday = 6;

  it('returns undefined for a plan without days', () => {
    expect(suggestDay([], SATURDAY)).toBeUndefined();
  });

  it('proposes the day assigned to today', () => {
    const days = [planDay(1, 3), planDay(2, 6), planDay(3, 1)];
    expect(suggestDay(days, SATURDAY)).toEqual({ reason: 'today', day: days[1] });
  });

  it('on a rest day proposes the next scheduled day, wrapping around the week', () => {
    const days = [planDay(1, 1), planDay(2, 3), planDay(3, 5)];
    expect(suggestDay(days, SATURDAY)).toEqual({ reason: 'restDay', day: days[0] });
    expect(suggestDay(days, 4)).toEqual({ reason: 'restDay', day: days[2] });
  });

  it('ignores unscheduled days when others have a weekday', () => {
    const days = [planDay(1), planDay(2, 2)];
    expect(suggestDay(days, SATURDAY)).toEqual({ reason: 'restDay', day: days[1] });
  });

  it('without weekdays proposes the first day when nothing was trained yet', () => {
    const days = [planDay(1), planDay(2), planDay(3)];
    expect(suggestDay(days, SATURDAY)).toEqual({ reason: 'rotation', day: days[0] });
  });

  it('without weekdays proposes the day after the last session, cycling', () => {
    const days = [planDay(1), planDay(2), planDay(3)];
    expect(suggestDay(days, SATURDAY, 1)?.day).toBe(days[1]);
    expect(suggestDay(days, SATURDAY, 3)?.day).toBe(days[0]);
  });
});
