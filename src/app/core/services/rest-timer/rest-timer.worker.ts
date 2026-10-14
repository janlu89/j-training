/// <reference lib="webworker" />

import type { TickerCommand } from './ticker-command';

/**
 * Ticks for the rest timer. Main-thread timers are throttled when the page is in the background;
 * a worker keeps a steadier pace. The countdown itself is computed from timestamps on the main
 * thread, so a late tick only delays the display, never the time.
 */
let interval: ReturnType<typeof setInterval> | undefined;

addEventListener('message', ({ data }: MessageEvent<TickerCommand>) => {
  clearInterval(interval);
  interval =
    data.type === 'start' ? setInterval(() => postMessage('tick'), data.intervalMs) : undefined;
});
