import { defaultRestFor } from './exercise-defaults';

describe('defaultRestFor', () => {
  it('proposes 2.5 minutes for compound lifts and 75 seconds for isolation work', () => {
    expect(defaultRestFor('multiarticolare')).toBe(150);
    expect(defaultRestFor(' Isolamento ')).toBe(75);
  });

  it('has no default for other types', () => {
    expect(defaultRestFor('core')).toBeUndefined();
    expect(defaultRestFor('')).toBeUndefined();
  });
});
