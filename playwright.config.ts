import { defineConfig, devices } from '@playwright/test';

const PORT = 4300;

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
  projects: [{ name: 'pixel', use: { ...devices['Pixel 7'] } }],
  webServer: {
    command: `npx ng serve --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env['CI'],
    timeout: 120_000,
  },
});
