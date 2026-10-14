import { EpochMs } from './entity.model';

/** What a rest is for: shown in the timer bar while it runs. */
export interface RestTarget {
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
