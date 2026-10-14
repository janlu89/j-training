import { Entity } from './entity.model';

/** ISO weekday: 1 = Monday … 7 = Sunday. */
export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

/** An ordered training day of a phase ("Giorno 1, 2, 3…"), created from the CSV `giorno` values. */
export interface TrainingDay extends Entity {
  phaseId: number;
  label: string;
  ordine: number;
  csvGiorno: string;
  weekday?: Weekday;
}
