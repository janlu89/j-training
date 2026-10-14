import { Injectable, InjectionToken, inject } from '@angular/core';

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

const BEEPS = 3;
const BEEP_GAP_S = 0.3;
const BEEP_LENGTH_S = 0.2;
const BEEP_HZ = 880;
export const REST_VIBRATION = [200, 100, 200, 100, 400];

/**
 * End-of-rest signal: three short beeps generated with Web Audio (no audio file to download or
 * cache) plus a vibration where supported.
 */
@Injectable({ providedIn: 'root' })
export class RestAlarm {
  private readonly platform = inject(ALARM_PLATFORM);
  private context: AudioContext | null = null;

  /**
   * Mobile browsers only let a page play audio after a user gesture: call it from the tap that
   * starts the rest, so the beeps can play when the rest ends.
   */
  prepare(): void {
    this.context ??= this.platform.createAudioContext();
    this.context?.resume().catch(() => undefined);
  }

  ring(): void {
    this.beep();
    this.platform.vibrate(REST_VIBRATION);
  }

  private beep(): void {
    const context = this.context;
    if (!context) {
      return;
    }
    for (let index = 0; index < BEEPS; index++) {
      const at = context.currentTime + index * BEEP_GAP_S;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.frequency.value = BEEP_HZ;
      // Short fade in and out: avoids the click of a square start and stop.
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(0.5, at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + BEEP_LENGTH_S);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(at);
      oscillator.stop(at + BEEP_LENGTH_S);
    }
  }
}
