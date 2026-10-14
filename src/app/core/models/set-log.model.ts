import { Entity, EpochMs } from './entity.model';
import { LoadUnit } from './exercise.model';

/**
 * One performed set. `esercizio` and `fase` are denormalised and indexed so that the
 * history of an exercise name works across phases without joins.
 */
export interface SetLog extends Entity {
  sessionId: number;
  exerciseId: number;
  esercizio: string;
  fase: number;
  date: EpochMs;
  setNo: number;
  kg: number;
  rip: number;
  rir?: number;
  unitaCarico: LoadUnit;
  recSecUsed?: number;
  note?: string;
}
