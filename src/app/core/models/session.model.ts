import { Entity, EpochMs } from './entity.model';

/** How a finished session ended. Both outcomes move the rotation to the next day. */
export type SessionOutcome = 'completed' | 'skipped';

/**
 * A workout session on a training day. While `endedAt` is undefined the session is a draft:
 * every recorded set is already stored, so closing the app loses nothing.
 */
export interface Session extends Entity {
  phaseId: number;
  dayId: number;
  startedAt: EpochMs;
  endedAt?: EpochMs;
  /** Not indexed: added in F4 without a new schema version. Undefined while the session is open. */
  outcome?: SessionOutcome;
}
