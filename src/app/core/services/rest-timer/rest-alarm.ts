import { Injectable, InjectionToken, inject, signal } from '@angular/core';
import { EpochMs } from '../../models';

/** Browser features used by the alarm, behind a token so tests can replace them. */
export interface AlarmPlatform {
  /** null where Web Audio is not available. */
  createAudioContext(): AudioContext | null;
  vibrate(pattern: number[]): void;
}

export const ALARM_PLATFORM = new InjectionToken<AlarmPlatform>('ALARM_PLATFORM', {
  providedIn: 'root',
  factory: () => ({
    createAudioContext: () => (typeof AudioContext === 'undefined' ? null : new AudioContext()),
    // Not available on iPhone: the sound is the primary signal.
    vibrate: (pattern) => void globalThis.navigator?.vibrate?.(pattern),
  }),
});

/** The countdown pips start this long before the end of the rest, one per second. */
export const ALARM_LEAD_MS = 5_000;
/** After zero the start signal repeats for this long, then stops by itself. */
export const START_SIGNAL_MS = 15_000;
/** A single warning sounds when this much of the rest is left, to get ready for the next set. */
export const WARNING_LEAD_MS = 15_000;

const PIPS = 5;
const PIP_HZ = 880;
const PIP_S = 0.12;
/** "Go": higher and longer than the pips, like the start of a race. */
const GO_HZ = 1_320;
const GO_S = 0.7;
/** After the first "go", a short double beep repeats until the signal ends. */
const REPEAT_EVERY_S = 1.5;
/** Two short beeps, the second starting this long after the first: under half a second. */
const DOUBLE_BEEP_S = 0.15;
const DOUBLE_BEEP_GAP_S = 0.25;
/** The warning is the highest sound of the rest, so it is never mistaken for the start signal. */
const WARNING_HZ = 1_760;
const VOLUME = 0.4;
const FADE_S = 0.01;
export const START_VIBRATION = [400, 200, 400];
export const WARNING_VIBRATION = [150, 100, 150];

/**
 * Rest signals, generated with Web Audio (no audio file to download or cache): a high double beep
 * 15 seconds before the end, then a pip per second in the last five seconds, a long "go" at zero,
 * and a repeated double beep and vibration for 15 seconds. The end signal is scheduled on the audio
 * clock at once, so it stays on time even when the page's own timers are throttled.
 */
@Injectable({ providedIn: 'root' })
export class RestAlarm {
  private readonly platform = inject(ALARM_PLATFORM);
  private context: AudioContext | null = null;
  /** All the sounds of one countdown go through this node, so they can be silenced together. */
  private output: GainNode | null = null;
  private scheduledEnd?: EpochMs;
  private vibrationStart?: ReturnType<typeof setTimeout>;
  private vibrationRepeat?: ReturnType<typeof setInterval>;
  private readonly ringingState = signal(false);

  /** From the first pip until the start signal ends or is stopped. */
  readonly ringing = this.ringingState.asReadonly();

  /**
   * Mobile browsers only let a page play audio after a user gesture: call it from the tap that
   * starts the rest, so the countdown can sound when the rest ends.
   */
  prepare(): void {
    this.context ??= this.platform.createAudioContext();
    this.context?.resume().catch(() => undefined);
  }

  /** Plays the countdown of a rest ending at `endsAt`; calling it again for the same end is a no-op. */
  start(endsAt: EpochMs, now: EpochMs): void {
    if (this.ringingState() && this.scheduledEnd === endsAt) {
      return;
    }
    this.stop();
    this.ringingState.set(true);
    this.scheduledEnd = endsAt;
    this.scheduleSounds((endsAt - now) / 1000);
    this.scheduleVibration(endsAt - now);
  }

  stop(): void {
    if (!this.ringingState()) {
      return;
    }
    this.ringingState.set(false);
    this.scheduledEnd = undefined;
    clearTimeout(this.vibrationStart);
    clearInterval(this.vibrationRepeat);
    this.platform.vibrate([]);
    if (this.output && this.context) {
      // A very short fade avoids the click of a hard cut; scheduled beeps then play silently.
      this.output.gain.setTargetAtTime(0, this.context.currentTime, FADE_S);
    }
    this.output = null;
  }

  /**
   * "15 seconds left": one high double beep and a short vibration, at once. Less than half a
   * second and separate from the countdown, which it never sets ringing.
   */
  warn(): void {
    this.platform.vibrate(WARNING_VIBRATION);
    const output = this.createOutput();
    if (output && this.context) {
      this.doubleBeep(output, this.context.currentTime, WARNING_HZ);
    }
  }

  private scheduleSounds(secondsToZero: number): void {
    const context = this.context;
    const output = this.createOutput();
    if (!context || !output) {
      return;
    }
    this.output = output;
    const now = context.currentTime;
    const zero = now + Math.max(0, secondsToZero);
    for (let pip = PIPS; pip >= 1; pip--) {
      const at = zero - pip;
      // A pip due a moment ago (the timer ticks every quarter second) still plays, at once.
      if (at > now - 0.3) {
        this.beep(output, Math.max(at, now), PIP_HZ, PIP_S);
      }
    }
    this.beep(output, zero, GO_HZ, GO_S);
    for (let at = zero + REPEAT_EVERY_S; at < zero + START_SIGNAL_MS / 1000; at += REPEAT_EVERY_S) {
      this.doubleBeep(output, at, GO_HZ);
    }
  }

  /** A volume node for a group of sounds, connected to the speakers; null without Web Audio. */
  private createOutput(): GainNode | null {
    const context = this.context;
    if (!context) {
      return null;
    }
    const output = context.createGain();
    output.connect(context.destination);
    return output;
  }

  private doubleBeep(output: GainNode, at: number, hz: number): void {
    this.beep(output, at, hz, DOUBLE_BEEP_S);
    this.beep(output, at + DOUBLE_BEEP_GAP_S, hz, DOUBLE_BEEP_S);
  }

  private beep(output: GainNode, at: number, hz: number, seconds: number): void {
    const context = this.context;
    if (!context) {
      return;
    }
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    oscillator.type = 'triangle';
    oscillator.frequency.value = hz;
    envelope.gain.setValueAtTime(0, at);
    envelope.gain.linearRampToValueAtTime(VOLUME, at + FADE_S);
    envelope.gain.setValueAtTime(VOLUME, at + seconds - FADE_S);
    envelope.gain.linearRampToValueAtTime(0, at + seconds);
    oscillator.connect(envelope).connect(output);
    oscillator.start(at);
    oscillator.stop(at + seconds);
  }

  /** Vibration only marks the start: at zero, then with each repeated beep, for 15 seconds. */
  private scheduleVibration(msToZero: number): void {
    this.vibrationStart = setTimeout(
      () => {
        let repeats = Math.floor(START_SIGNAL_MS / (REPEAT_EVERY_S * 1000));
        this.platform.vibrate(START_VIBRATION);
        this.vibrationRepeat = setInterval(() => {
          this.platform.vibrate(START_VIBRATION);
          if (--repeats <= 0) {
            clearInterval(this.vibrationRepeat);
          }
        }, REPEAT_EVERY_S * 1000);
      },
      Math.max(0, msToZero),
    );
  }
}
