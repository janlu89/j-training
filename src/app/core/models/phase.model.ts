import { Entity, EpochMs } from './entity.model';

export type PhaseStatus = 'active' | 'archived';

/**
 * One imported training plan ("scheda"), identified by the CSV `fase` column and a user-facing name.
 * Plans are never overwritten: importing a new one archives the active plan, which stays available.
 */
export interface Phase extends Entity {
  name: string;
  fase: number;
  status: PhaseStatus;
  importedAt: EpochMs;
}
