/** Messages from the page to the ticker worker. */
export type TickerCommand = { type: 'start'; intervalMs: number } | { type: 'stop' };
