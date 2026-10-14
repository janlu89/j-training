import { EpochMs } from './entity.model';

/** Between two sets of the same exercise, or before the next exercise. */
export type RestKind = 'sets' | 'exercises';

/** What a rest is for: shown in the timer bar while it runs. */
export interface RestTarget {
  kind: RestKind;
  /** The exercise the rest leads to: the same one between sets, the next one between exercises. */
  exerciseId: number;
  exercise: string;
  seconds: number;
}

/** A running (or just finished) rest. Times are timestamps: the countdown survives throttling. */
export interface RestTimer {
  target: RestTarget;
  startedAt: EpochMs;
  endsAt: EpochMs;
}

/** Rest before the next exercise when the user has not chosen another one in the settings. */
export const DEFAULT_EXERCISE_REST_SECONDS = 120;
