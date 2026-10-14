import { TestBed } from '@angular/core/testing';
import { ALARM_PLATFORM, REST_VIBRATION, RestAlarm } from './rest-alarm';

/** Just enough of Web Audio to check the tone played by the alarm. */
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
    currentTime: 0,
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

  afterEach(() => {
    vi.useRealTimers();
  });

  it('rings with a continuous tone and a repeated vibration until stopped', () => {
    vi.useFakeTimers();
    const context = fakeAudioContext();
    const { alarm, vibrate } = setup(context);

    alarm.prepare();
    alarm.start();
    alarm.start();
    vi.advanceTimersByTime(3_000);

    expect(context.resume).toHaveBeenCalledOnce();
    expect(context.createOscillator).toHaveBeenCalledOnce();
    const oscillator = context.createOscillator.mock.results[0].value;
    expect(oscillator.start).toHaveBeenCalledOnce();
    expect(oscillator.stop).not.toHaveBeenCalled();
    expect(alarm.ringing()).toBe(true);
    expect(vibrate).toHaveBeenCalledTimes(3);
    expect(vibrate).toHaveBeenCalledWith(REST_VIBRATION);

    alarm.stop();
    vi.advanceTimersByTime(3_000);

    expect(alarm.ringing()).toBe(false);
    expect(oscillator.stop).toHaveBeenCalledOnce();
    expect(vibrate).toHaveBeenLastCalledWith([]);
    expect(vibrate).toHaveBeenCalledTimes(4);
  });

  it('still vibrates where Web Audio is not available', () => {
    const { alarm, vibrate } = setup(null);
    alarm.prepare();
    alarm.start();
    alarm.stop();
    expect(vibrate).toHaveBeenCalledWith(REST_VIBRATION);
  });
});
