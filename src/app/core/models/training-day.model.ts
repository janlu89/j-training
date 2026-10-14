import { Entity } from './entity.model';

/** ISO weekday: 1 = Monday … 7 = Sunday. */
export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export const WEEKDAYS: readonly Weekday[] = [1, 2, 3, 4, 5, 6, 7];

/**
 * An ordered training day of a plan. The UI label ("Giorno 1", "Day 1") is derived from `ordine`
 * through translations, so no language-specific text is stored.
 */
export interface TrainingDay extends Entity {
  phaseId: number;
  ordine: number;
  /** Original value of the CSV `giorno` column (e.g. "sabato"). */
  csvGiorno: string;
  weekday?: Weekday;
}
