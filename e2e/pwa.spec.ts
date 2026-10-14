import { Page, expect, test } from '@playwright/test';

interface Manifest {
  name: string;
  display: string;
  start_url: string;
  scope: string;
  icons: { src: string; sizes: string; purpose: string }[];
}

/** Waits until the service worker controls the page and holds every file of the app. */
async function waitForOfflineCache(page: Page): Promise<void> {
  await page.evaluate(() => navigator.serviceWorker.ready);
  const expected = await page.evaluate(async () => {
    const config = (await (await fetch('ngsw.json')).json()) as {
      assetGroups: { name: string; urls: string[] }[];
    };
    return config.assetGroups.find((group) => group.name === 'app')!.urls.length;
  });
  await expect
    .poll(
      () =>
        page.evaluate(async () => {
          const name = (await caches.keys()).find((key) => key.includes(':assets:app:cache'));
          return name ? (await (await caches.open(name)).keys()).length : 0;
        }),
      { timeout: 30_000 },
    )
    .toBe(expected);
}

test.describe('installable app', () => {
  test('declares a manifest with its icons, as GitHub Pages serves it', async ({ page }) => {
    await page.goto('./');

    const href = await page.locator('link[rel="manifest"]').getAttribute('href');
    const manifest = (await (await page.request.get(href!)).json()) as Manifest;
    expect(manifest).toMatchObject({
      name: 'J-Training',
      display: 'standalone',
      start_url: './',
      scope: './',
    });
    expect(manifest.icons.map((icon) => `${icon.sizes} ${icon.purpose}`)).toEqual([
      '192x192 any',
      '512x512 any',
      '192x192 maskable',
      '512x512 maskable',
    ]);
    for (const icon of manifest.icons) {
      const response = await page.request.get(icon.src);
      expect(response.headers()['content-type']).toBe('image/png');
    }
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#14213d');
  });

  test('works offline once loaded, deep links and translations included', async ({
    page,
    context,
  }) => {
    test.setTimeout(90_000);
    await page.goto('./');
    await expect(page.getByRole('heading', { name: 'Nessuna scheda attiva' })).toBeVisible();
    await waitForOfflineCache(page);

    await context.setOffline(true);
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Nessuna scheda attiva' })).toBeVisible();

    await page.getByRole('link', { name: 'Impostazioni' }).click();
    await expect(page.getByRole('heading', { name: 'Impostazioni' })).toBeVisible();
    await expect(page.getByText('Versione 1.0.0')).toBeVisible();

    await page.goto('plans');
    await expect(page.getByRole('heading', { name: 'Nessuna scheda importata' })).toBeVisible();
  });
});
