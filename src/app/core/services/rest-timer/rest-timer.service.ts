import { DOCUMENT, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { fromEvent } from 'rxjs';
import { RestTarget, RestTimer } from '../../models';
import { CLOCK } from '../clock';
import { ALARM_LEAD_MS, RestAlarm } from './rest-alarm';
import { ScreenWakeLock } from './screen-wake-lock';
import { TICKER } from './ticker';

/**
 * The rest timer between sets. One at a time, application-wide, so it keeps running while the
 * user edits an exercise or looks at another page. The remaining time is always `endsAt - now`:
 * ticks only wake the timer up, so throttled or late ticks never make the countdown drift.
 * The alarm starts in the last seconds and rings until the user stops it.
 */
@Injectable({ providedIn: 'root' })
export class RestTimerService {
  private readonly clock = inject(CLOCK);
  private readonly ticker = inject(TICKER);
  private readonly alarm = inject(RestAlarm);
  private readonly wakeLock = inject(ScreenWakeLock);
  private readonly document = inject(DOCUMENT);

  private readonly current = signal<RestTimer | null>(null);
  private readonly now = signal(0);
  private readonly done = signal(false);

  readonly timer = this.current.asReadonly();
  /** The alarm is sounding: the last seconds of the rest, then until the user stops it. */
  readonly ringing = this.alarm.ringing;
  /** True once the time is up, until the timer is dismissed or restarted. */
  readonly finished = this.done.asReadonly();
  /** Milliseconds left, never negative. */
  readonly remainingMs = computed(() => {
    const timer = this.current();
    return timer ? Math.max(0, timer.endsAt - this.now()) : 0;
  });
  /** Elapsed share of the rest, from 0 to 1. */
  readonly progress = computed(() => {
    const timer = this.current();
    const total = timer ? timer.endsAt - timer.startedAt : 0;
    return total > 0 ? 1 - this.remainingMs() / total : 1;
  });

  constructor() {
    // Back from the background: update at once instead of waiting for the next tick.
    fromEvent(this.document, 'visibilitychange')
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.tick());
  }

  /** Starts (or restarts) the rest. Call it from the user's tap, so the alarm can play later. */
  start(target: RestTarget): void {
    const now = this.clock();
    this.alarm.stop();
    this.alarm.prepare();
    this.current.set({ target, startedAt: now, endsAt: now + target.seconds * 1000 });
    this.now.set(now);
    this.done.set(false);
    this.ticker.start(() => this.tick());
    void this.wakeLock.acquire();
  }

  /** Adds (or removes, with a negative value) time to the running rest. */
  adjust(seconds: number): void {
    if (this.done()) {
      return;
    }
    this.current.update(
      (timer) =>
        timer && { ...timer, endsAt: Math.max(this.clock(), timer.endsAt + seconds * 1000) },
    );
    this.tick();
  }

  /** Stops the rest, or the alarm of the finished one. */
  stop(): void {
    this.alarm.stop();
    this.ticker.stop();
    this.current.set(null);
    this.done.set(false);
    void this.wakeLock.release();
  }

  /**
   * Reads the clock. In the last seconds the alarm starts (and stops again if time is added);
   * when the time is up ticking stops, while the alarm and the screen stay on until `stop`.
   */
  tick(): void {
    const timer = this.current();
    if (!timer || this.done()) {
      return;
    }
    const now = this.clock();
    this.now.set(now);
    if (timer.endsAt - now <= ALARM_LEAD_MS) {
      this.alarm.start();
    } else {
      this.alarm.stop();
    }
    if (now >= timer.endsAt) {
      this.done.set(true);
      this.ticker.stop();
    }
  }
}

/** "2:05" for 125 s; partial seconds count as a full second, so 0:00 means the rest is over. */
export function formatRest(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
