import { Translation } from '@jsverse/transloco';
import { TEST_TRANSLATIONS } from '../testing/transloco-testing';

function flattenKeys(translation: Translation, prefix = ''): string[] {
  return Object.entries(translation).flatMap(([key, value]) =>
    typeof value === 'object' && value !== null
      ? flattenKeys(value as Translation, `${prefix}${key}.`)
      : [`${prefix}${key}`],
  );
}

describe('translation files', () => {
  it('define the same keys in Italian and English', () => {
    const italian = flattenKeys(TEST_TRANSLATIONS['it']).sort();
    const english = flattenKeys(TEST_TRANSLATIONS['en']).sort();
    expect(english).toEqual(italian);
  });

  it('have no empty values', () => {
    for (const translation of Object.values(TEST_TRANSLATIONS)) {
      const empty = flattenKeys(translation).filter(
        (key) =>
          key
            .split('.')
            .reduce<unknown>((node, part) => (node as Translation)[part], translation) === '',
      );
      expect(empty).toEqual([]);
    }
  });
});
