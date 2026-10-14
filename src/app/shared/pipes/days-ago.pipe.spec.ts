import { formatDaysAgo } from './days-ago.pipe';

const NOW = new Date(2026, 9, 15, 9, 0).getTime();
const at = (month: number, day: number, hour = 20) => new Date(2026, month, day, hour).getTime();

describe('formatDaysAgo', () => {
  it.each([
    [at(9, 15, 7), 'oggi'],
    [at(9, 14, 23), 'ieri'],
    [at(9, 12), '3 giorni fa'],
    [at(9, 8), 'settimana scorsa'],
    [at(9, 1), '2 settimane fa'],
    [at(7, 10), '2 mesi fa'],
    [new Date(2025, 8, 1).getTime(), 'anno scorso'],
  ])('says how long ago %s was in Italian', (value, text) => {
    expect(formatDaysAgo(value, NOW, 'it')).toContain(text);
  });

  it('follows the UI language', () => {
    expect(formatDaysAgo(at(9, 12), NOW, 'en')).toBe('3 days ago');
    expect(formatDaysAgo(at(9, 14), NOW, 'en')).toBe('yesterday');
  });

  it('never talks about the future', () => {
    expect(formatDaysAgo(NOW + 86_400_000, NOW, 'it')).toBe('oggi');
  });
});
