import { Entity, EpochMs } from './entity.model';

/** A workout session on a training day. Open while `endedAt` is undefined. */
export interface Session extends Entity {
  phaseId: number;
  dayId: number;
  startedAt: EpochMs;
  endedAt?: EpochMs;
}
