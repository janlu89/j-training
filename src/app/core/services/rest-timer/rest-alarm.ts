import { Injectable, InjectionToken, inject, signal } from '@angular/core';

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

/** The alarm starts this long before the end of the rest. */
export const ALARM_LEAD_MS = 5_000;
/** A high pitch carries well over gym noise and phone speakers are loudest around 1–3 kHz. */
const TONE_HZ = 1_760;
const TONE_GAIN = 0.35;
const FADE_S = 0.03;
export const REST_VIBRATION = [400, 200, 400];
const VIBRATION_EVERY_MS = 1_500;

interface Tone {
  oscillator: OscillatorNode;
  gain: GainNode;
}

/**
 * End-of-rest alarm: a high continuous tone, generated with Web Audio (no audio file to download
 * or cache), plus a repeated vibration where supported. It rings until it is stopped.
 */
@Injectable({ providedIn: 'root' })
export class RestAlarm {
  private readonly platform = inject(ALARM_PLATFORM);
  private context: AudioContext | null = null;
  private tone: Tone | null = null;
  private vibration?: ReturnType<typeof setInterval>;
  private readonly ringingState = signal(false);

  readonly ringing = this.ringingState.asReadonly();

  /**
   * Mobile browsers only let a page play audio after a user gesture: call it from the tap that
   * starts the rest, so the alarm can sound when the rest ends.
   */
  prepare(): void {
    this.context ??= this.platform.createAudioContext();
    this.context?.resume().catch(() => undefined);
  }

  /** Starts ringing; calling it again while ringing changes nothing. */
  start(): void {
    if (this.ringingState()) {
      return;
    }
    this.ringingState.set(true);
    this.tone = this.playTone();
    this.platform.vibrate(REST_VIBRATION);
    this.vibration = setInterval(() => this.platform.vibrate(REST_VIBRATION), VIBRATION_EVERY_MS);
  }

  stop(): void {
    if (!this.ringingState()) {
      return;
    }
    this.ringingState.set(false);
    clearInterval(this.vibration);
    this.platform.vibrate([]);
    const tone = this.tone;
    this.tone = null;
    if (tone && this.context) {
      // A short fade out avoids the click of a hard stop.
      const end = this.context.currentTime + FADE_S;
      tone.gain.gain.setTargetAtTime(0, this.context.currentTime, FADE_S / 3);
      tone.oscillator.stop(end);
    }
  }

  private playTone(): Tone | null {
    const context = this.context;
    if (!context) {
      return null;
    }
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'triangle';
    oscillator.frequency.value = TONE_HZ;
    gain.gain.setValueAtTime(0, context.currentTime);
    gain.gain.linearRampToValueAtTime(TONE_GAIN, context.currentTime + FADE_S);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    return { oscillator, gain };
  }
}
