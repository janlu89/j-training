import { defineConfig, devices } from '@playwright/test';

const PORT = 4300;
/** The production build, served like GitHub Pages: only there the service worker runs. */
const PWA_PORT = 4400;
const PWA_SPEC = /pwa\.spec\.ts/;

/** End-to-end tests on a mobile profile: the app is designed for phones first. */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 1 : 0,
  reporter: process.env['CI'] ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: 'it-IT',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'pixel', testIgnore: PWA_SPEC, use: { ...devices['Pixel 7'] } },
    {
      name: 'pwa',
      testMatch: PWA_SPEC,
      use: { ...devices['Pixel 7'], baseURL: `http://localhost:${PWA_PORT}/j-training/` },
    },
  ],
  webServer: [
    {
      command: `npx ng serve --port ${PORT}`,
      url: `http://localhost:${PORT}`,
      reuseExistingServer: !process.env['CI'],
      timeout: 120_000,
    },
    {
      command: `npm run build:pages && node scripts/serve-dist.mjs ${PWA_PORT}`,
      url: `http://localhost:${PWA_PORT}/j-training/`,
      reuseExistingServer: !process.env['CI'],
      timeout: 300_000,
    },
  ],
});
