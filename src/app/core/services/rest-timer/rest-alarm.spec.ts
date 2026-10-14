import { TestBed } from '@angular/core/testing';
import { ALARM_PLATFORM, REST_VIBRATION, RestAlarm } from './rest-alarm';

/** Just enough of Web Audio to count the beeps scheduled by the alarm. */
function fakeAudioContext() {
  const param = () => ({
    value: 0,
    setValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
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

  it('unlocks audio on the user tap, then beeps three times and vibrates', () => {
    const context = fakeAudioContext();
    const { alarm, vibrate } = setup(context);

    alarm.prepare();
    alarm.ring();

    expect(context.resume).toHaveBeenCalledOnce();
    expect(context.createOscillator).toHaveBeenCalledTimes(3);
    expect(vibrate).toHaveBeenCalledWith(REST_VIBRATION);
  });

  it('still vibrates where Web Audio is not available', () => {
    const { alarm, vibrate } = setup(null);
    alarm.prepare();
    alarm.ring();
    expect(vibrate).toHaveBeenCalledOnce();
  });
});
