import { TestBed } from '@angular/core/testing';
import { ALARM_PLATFORM, RestAlarm, START_VIBRATION } from './rest-alarm';

/** Just enough of Web Audio to check what the alarm schedules. */
function fakeAudioContext() {
  const param = () => ({
    value: 0,
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    setTargetAtTime: vi.fn(),
  });
  const node = () => {
    const audioNode = { connect: vi.fn() };
    audioNode.connect.mockReturnValue(audioNode);
    return audioNode;
  };
  return {
    currentTime: 100,
    destination: {},
    resume: vi.fn().mockResolvedValue(undefined),
    createOscillator: vi.fn(() => ({
      ...node(),
      type: 'sine',
      frequency: param(),
      start: vi.fn(),
      stop: vi.fn(),
    })),
    createGain: vi.fn(() => ({ ...node(), gain: param() })),
  };
}

describe('RestAlarm', () => {
  function setup(context: ReturnType<typeof fakeAudioContext> | null) {
    const vibrate = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: ALARM_PLATFORM,
          useValue: { createAudioContext: () => context as unknown as AudioContext, vibrate },
        },
      ],
    });
    return { alarm: TestBed.inject(RestAlarm), vibrate };
  }

  /** [frequency, start time on the audio clock] of every scheduled beep. */
  function beeps(context: ReturnType<typeof fakeAudioContext>): [number, number][] {
    return context.createOscillator.mock.results.map(({ value }) => [
      value.frequency.value,
      value.start.mock.calls[0][0],
    ]);
  }

  afterEach(() => {
    vi.useRealTimers();
  });

  it('counts down the last 5 seconds, then plays the start signal for 15 seconds', () => {
    const context = fakeAudioContext();
    const { alarm } = setup(context);
    alarm.prepare();

    alarm.start(10_000, 5_000);
    alarm.start(10_000, 5_250);

    const scheduled = beeps(context);
    expect(scheduled.slice(0, 6)).toEqual([
      [880, 100],
      [880, 101],
      [880, 102],
      [880, 103],
      [880, 104],
      [1_320, 105],
    ]);
    // Then a double beep every 1.5 s until 15 s after zero.
    const repeats = scheduled.slice(6);
    expect(repeats).toHaveLength(18);
    expect(repeats.every(([hz, at]) => hz === 1_320 && at > 105 && at < 120)).toBe(true);
    expect(alarm.ringing()).toBe(true);
  });

  it('skips the pips already past when it starts late', () => {
    const context = fakeAudioContext();
    const { alarm } = setup(context);
    alarm.prepare();

    alarm.start(10_000, 7_500);

    expect(beeps(context).slice(0, 3)).toEqual([
      [880, 100.5],
      [880, 101.5],
      [1_320, 102.5],
    ]);
  });

  it('vibrates from zero, repeatedly, and stops everything when stopped', () => {
    vi.useFakeTimers();
    const context = fakeAudioContext();
    const { alarm, vibrate } = setup(context);
    alarm.prepare();

    alarm.start(10_000, 5_000);
    vi.advanceTimersByTime(4_999);
    expect(vibrate).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1 + 3_000);
    expect(vibrate).toHaveBeenCalledTimes(3);
    expect(vibrate).toHaveBeenCalledWith(START_VIBRATION);

    alarm.stop();
    vi.advanceTimersByTime(10_000);

    expect(alarm.ringing()).toBe(false);
    expect(vibrate).toHaveBeenLastCalledWith([]);
    expect(vibrate).toHaveBeenCalledTimes(4);
    const output = context.createGain.mock.results[0].value;
    expect(output.gain.setTargetAtTime).toHaveBeenCalledWith(0, 100, expect.any(Number));
  });

  it('stops vibrating by itself after the start signal', () => {
    vi.useFakeTimers();
    const { alarm, vibrate } = setup(null);
    alarm.prepare();
    alarm.start(1_000, 0);

    vi.advanceTimersByTime(60_000);

    expect(vibrate).toHaveBeenCalledTimes(11);
  });
});
