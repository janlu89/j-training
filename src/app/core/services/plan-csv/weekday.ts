import { Weekday } from '../../models';

const WEEKDAY_NAMES: Readonly<Record<string, Weekday>> = {
  lunedi: 1,
  martedi: 2,
  mercoledi: 3,
  giovedi: 4,
  venerdi: 5,
  sabato: 6,
  domenica: 7,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
  sunday: 7,
};

/** Recognises an Italian or English weekday name, with or without accents ("mercoledì"). */
export function weekdayFromText(text: string): Weekday | undefined {
  const normalized = text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
    .toLowerCase();
  return WEEKDAY_NAMES[normalized];
}
