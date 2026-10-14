import { InjectionToken } from '@angular/core';
import type { TickerCommand } from './ticker-command';

/** A periodic signal that wakes the rest timer up; the timer reads the clock on each tick. */
export interface Ticker {
  start(onTick: () => void): void;
  stop(): void;
}

const TICK_MS = 250;

/** Ticks from a Web Worker, created on first use. */
class WorkerTicker implements Ticker {
  private worker?: Worker;

  start(onTick: () => void): void {
    this.worker ??= new Worker(new URL('./rest-timer.worker', import.meta.url), {
      type: 'module',
    });
    this.worker.onmessage = () => onTick();
    this.send({ type: 'start', intervalMs: TICK_MS });
  }

  stop(): void {
    this.send({ type: 'stop' });
  }

  private send(command: TickerCommand): void {
    this.worker?.postMessage(command);
  }
}

/** Fallback where Web Workers are not available, such as the unit test environment. */
class IntervalTicker implements Ticker {
  private interval?: ReturnType<typeof setInterval>;

  start(onTick: () => void): void {
    this.stop();
    this.interval = setInterval(onTick, TICK_MS);
  }

  stop(): void {
    clearInterval(this.interval);
    this.interval = undefined;
  }
}

export const TICKER = new InjectionToken<Ticker>('TICKER', {
  providedIn: 'root',
  factory: () => (typeof Worker === 'undefined' ? new IntervalTicker() : new WorkerTicker()),
});
