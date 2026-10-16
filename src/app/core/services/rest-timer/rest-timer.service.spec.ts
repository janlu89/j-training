import { DOCUMENT, signal } from '@angular/core';
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
  let alarm: {
    prepare: ReturnType<typeof vi.fn>;
    start: ReturnType<typeof vi.fn>;
    stop: ReturnType<typeof vi.fn>;
    warn: ReturnType<typeof vi.fn>;
    ringing: ReturnType<typeof signal<boolean>>;
  };
  let wakeLock: { acquire: ReturnType<typeof vi.fn>; release: ReturnType<typeof vi.fn> };
  let timer: RestTimerService;

  beforeEach(() => {
    now = 10_000;
    ticker = new ManualTicker();
    const ringing = signal(false);
    alarm = {
      prepare: vi.fn(),
      start: vi.fn(() => ringing.set(true)),
      stop: vi.fn(() => ringing.set(false)),
      warn: vi.fn(),
      ringing,
    };
    wakeLock = {
      acquire: vi.fn().mockResolvedValue(undefined),
      release: vi.fn().mockResolvedValue(undefined),
    };
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

  const squat = { kind: 'sets' as const, exerciseId: 1, exercise: 'Squat', seconds: 90 };

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
    now += 80_000;
    advance(0);
    expect(timer.remainingMs()).toBe(10_000);
  });

  it('plays the countdown in the last 5 seconds, then closes the rest 15 s after the end', () => {
    timer.start(squat);
    const endsAt = now + 90_000;

    advance(84_000);
    expect(timer.ringing()).toBe(false);
    advance(1_000);
    expect(timer.ringing()).toBe(true);
    expect(alarm.start).toHaveBeenLastCalledWith(endsAt, now);

    advance(5_000);
    expect(timer.finished()).toBe(true);
    expect(timer.remainingMs()).toBe(0);
    expect(timer.ringing()).toBe(true);
    expect(ticker.running).toBe(true);
    expect(wakeLock.release).not.toHaveBeenCalled();

    advance(14_000);
    expect(timer.timer()).not.toBeNull();
    advance(1_000);
    expect(timer.timer()).toBeNull();
    expect(timer.ringing()).toBe(false);
    expect(ticker.running).toBe(false);
    expect(wakeLock.release).toHaveBeenCalledOnce();
  });

  it('warns once when 15 seconds are left', () => {
    timer.start(squat);

    advance(74_000);
    expect(alarm.warn).not.toHaveBeenCalled();
    advance(1_000);
    expect(alarm.warn).toHaveBeenCalledOnce();
    expect(timer.ringing()).toBe(false);

    advance(1_000);
    advance(9_000);
    advance(5_000);
    expect(alarm.warn).toHaveBeenCalledOnce();
  });

  it('warns after a late tick, unless it lands in the countdown', () => {
    timer.start(squat);
    advance(82_000);
    expect(alarm.warn).toHaveBeenCalledOnce();

    timer.start(squat);
    advance(86_000);
    expect(alarm.warn).toHaveBeenCalledOnce();
    expect(timer.ringing()).toBe(true);
  });

  it('is closing from 15 seconds before the end until the rest is dismissed', () => {
    timer.start(squat);

    advance(74_000);
    expect(timer.closing()).toBe(false);
    advance(1_000);
    expect(timer.closing()).toBe(true);
    advance(20_000);
    expect(timer.closing()).toBe(true);

    timer.stop();
    expect(timer.closing()).toBe(false);
  });

  it('never warns when the rest is 15 seconds or less', () => {
    timer.start({ ...squat, seconds: 15 });
    advance(0);
    advance(5_000);
    expect(alarm.warn).not.toHaveBeenCalled();
  });

  it('warns again only when added time goes back above 15 seconds', () => {
    timer.start(squat);
    advance(80_000);
    expect(alarm.warn).toHaveBeenCalledOnce();

    timer.adjust(-3);
    expect(alarm.warn).toHaveBeenCalledOnce();

    timer.adjust(15);
    expect(timer.remainingMs()).toBe(22_000);
    advance(7_000);
    expect(alarm.warn).toHaveBeenCalledTimes(2);
  });

  it('silences the alarm and lets the screen sleep only when the user stops it', () => {
    timer.start(squat);
    advance(90_000);

    timer.stop();

    expect(timer.ringing()).toBe(false);
    expect(timer.timer()).toBeNull();
    expect(wakeLock.release).toHaveBeenCalledOnce();
  });

  it('stops the alarm when time is added in the last seconds', () => {
    timer.start(squat);
    advance(87_000);
    expect(timer.ringing()).toBe(true);

    timer.adjust(15);

    expect(timer.ringing()).toBe(false);
    expect(timer.remainingMs()).toBe(18_000);
  });

  it('adds and removes time, never ending in the past', () => {
    timer.start(squat);

    timer.adjust(15);
    expect(timer.remainingMs()).toBe(105_000);

    timer.adjust(-200);
    expect(timer.finished()).toBe(true);
    expect(timer.ringing()).toBe(true);
  });

  it('restarts with the new exercise when another set is ticked, silencing the alarm', () => {
    timer.start(squat);
    advance(90_000);

    timer.start({ kind: 'exercises', exerciseId: 2, exercise: 'Panca', seconds: 120 });

    expect(timer.timer()?.target.exercise).toBe('Panca');
    expect(timer.remainingMs()).toBe(120_000);
    expect(timer.finished()).toBe(false);
    expect(timer.ringing()).toBe(false);
  });

  it('stops a running rest', () => {
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
