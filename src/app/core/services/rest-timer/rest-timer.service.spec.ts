import { DOCUMENT } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CLOCK } from '../clock';
import { RestAlarm } from './rest-alarm';
import { RestTimerService, formatRest } from './rest-timer.service';
import { ScreenWakeLock } from './screen-wake-lock';
import { TICKER, Ticker } from './ticker';

class ManualTicker implements Ticker {
  onTick?: () => void;
  running = false;
  start(onTick: () => void): void {
    this.onTick = onTick;
    this.running = true;
  }
  stop(): void {
    this.running = false;
  }
}

describe('RestTimerService', () => {
  let now: number;
  let ticker: ManualTicker;
  let alarm: { prepare: ReturnType<typeof vi.fn>; ring: ReturnType<typeof vi.fn> };
  let wakeLock: { acquire: ReturnType<typeof vi.fn>; release: ReturnType<typeof vi.fn> };
  let timer: RestTimerService;

  beforeEach(() => {
    now = 10_000;
    ticker = new ManualTicker();
    alarm = { prepare: vi.fn(), ring: vi.fn() };
    wakeLock = { acquire: vi.fn().mockResolvedValue(undefined), release: vi.fn() };
    wakeLock.release.mockResolvedValue(undefined);
    TestBed.configureTestingModule({
      providers: [
        { provide: CLOCK, useValue: () => now },
        { provide: TICKER, useValue: ticker },
        { provide: RestAlarm, useValue: alarm },
        { provide: ScreenWakeLock, useValue: wakeLock },
      ],
    });
    timer = TestBed.inject(RestTimerService);
  });

  const squat = { exerciseId: 1, exercise: 'Squat', seconds: 90 };

  function advance(ms: number): void {
    now += ms;
    ticker.onTick?.();
  }

  it('counts down from the planned rest, keeping the screen on', () => {
    timer.start(squat);

    expect(timer.remainingMs()).toBe(90_000);
    expect(alarm.prepare).toHaveBeenCalledOnce();
    expect(wakeLock.acquire).toHaveBeenCalledOnce();
    expect(ticker.running).toBe(true);

    advance(30_000);
    expect(timer.remainingMs()).toBe(60_000);
    expect(timer.progress()).toBeCloseTo(1 / 3);
  });

  it('uses the clock, not the number of ticks: a late tick after the background is exact', () => {
    timer.start(squat);
    now += 85_000;
    advance(0);
    expect(timer.remainingMs()).toBe(5_000);
  });

  it('rings once when the time is up, then stops ticking and lets the screen sleep', () => {
    timer.start(squat);

    advance(90_000);
    advance(1_000);

    expect(timer.finished()).toBe(true);
    expect(timer.remainingMs()).toBe(0);
    expect(alarm.ring).toHaveBeenCalledOnce();
    expect(ticker.running).toBe(false);
    expect(wakeLock.release).toHaveBeenCalledOnce();
  });

  it('adds and removes time, never ending in the past', () => {
    timer.start(squat);

    timer.adjust(15);
    expect(timer.remainingMs()).toBe(105_000);

    timer.adjust(-200);
    expect(timer.finished()).toBe(true);
    expect(alarm.ring).toHaveBeenCalledOnce();
  });

  it('restarts with the new exercise when another set is ticked', () => {
    timer.start(squat);
    advance(80_000);

    timer.start({ exerciseId: 2, exercise: 'Panca', seconds: 120 });

    expect(timer.timer()?.target.exercise).toBe('Panca');
    expect(timer.remainingMs()).toBe(120_000);
    expect(timer.finished()).toBe(false);
  });

  it('stops or dismisses the rest', () => {
    timer.start(squat);
    timer.stop();

    expect(timer.timer()).toBeNull();
    expect(ticker.running).toBe(false);
    expect(wakeLock.release).toHaveBeenCalledOnce();
  });

  it('updates at once when the page comes back from the background', () => {
    timer.start(squat);
    now += 95_000;

    TestBed.inject(DOCUMENT).dispatchEvent(new Event('visibilitychange'));

    expect(timer.finished()).toBe(true);
  });
});

describe('formatRest', () => {
  it.each([
    [150_000, '2:30'],
    [65_000, '1:05'],
    [59_001, '1:00'],
    [400, '0:01'],
    [0, '0:00'],
  ])('shows %i ms as %s', (ms, text) => {
    expect(formatRest(ms)).toBe(text);
  });
});
