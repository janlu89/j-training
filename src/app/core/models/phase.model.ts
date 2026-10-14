import { Entity, EpochMs } from './entity.model';

export type PhaseStatus = 'active' | 'archived';

/** One imported iteration of the training plan (the CSV `fase` column). */
export interface Phase extends Entity {
  fase: number;
  status: PhaseStatus;
  importedAt: EpochMs;
}
