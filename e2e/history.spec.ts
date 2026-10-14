import { Page, expect, test } from '@playwright/test';
import { join } from 'node:path';

const ROTATION_PLAN = join(__dirname, 'fixtures', 'scheda-rotazione.csv');

/** Four Thursdays of squats with a growing load, recorded through the app's own screens. */
const WEEKS = [
  { date: '2026-09-24T18:00:00', kg: '80' },
  { date: '2026-10-01T18:00:00', kg: '82,5' },
  { date: '2026-10-08T18:00:00', kg: '82,5' },
  { date: '2026-10-15T18:00:00', kg: '85' },
];

async function trainDayA(page: Page, date: string, kg: string): Promise<void> {
  await page.clock.setFixedTime(new Date(date));
  await page.goto('/workout');
  await page.getByRole('link', { name: 'Inizia Giorno 1 · A' }).click();
  const squat = page.getByRole('region', { name: 'Squat' });
  for (const set of [1, 2, 3]) {
    await squat.getByLabel(`Serie ${set}, kg`).fill(kg);
  }
  await page.getByRole('button', { name: 'Salva giornata' }).click();
  const dialog = page.getByRole('dialog', { name: 'Salva giornata' });
  await dialog.getByRole('button', { name: 'Salva', exact: true }).click();
  await expect(page).toHaveURL(/\/workout$/);
}

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date(WEEKS[0].date));
  await page.goto('/plans/import');
  await page.getByTestId('plan-file').setInputFiles(ROTATION_PLAN);
  await page.getByRole('button', { name: 'Importa', exact: true }).click();
  await expect(page).toHaveURL(/\/workout$/);
  for (const { date, kg } of WEEKS) {
    await trainDayA(page, date, kg);
  }
  // A skipped day appears in the history too.
  await page.getByRole('link', { name: 'Inizia Giorno 2 · B' }).click();
  await page.getByRole('button', { name: 'Salta giornata' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Salta' }).click();
  await expect(page).toHaveURL(/\/workout$/);
});

test.describe('history and analytics', () => {
  test('lists every saved day and opens its sets', async ({ page }) => {
    await page.getByRole('link', { name: 'Storico' }).click();

    const items = page.getByRole('listitem');
    await expect(items).toHaveCount(5);
    await expect(items.first()).toContainText('Giorno 2 · B');
    await expect(items.first()).toContainText('Saltata');
    await expect(items.nth(1)).toContainText('gio 15 ott 2026');
    await expect(items.nth(1)).toContainText('Serie: 6 · Esercizi: 2');

    await items.nth(1).getByRole('link').click();
    await expect(page.getByRole('heading', { name: 'Giorno 1 · A' })).toBeVisible();
    const squat = page.getByRole('listitem').filter({ hasText: 'Squat' });
    await expect(squat).toContainText('85 × 8');
    await expect(page.getByRole('listitem').filter({ hasText: 'Curl' })).toContainText(
      'kg per braccio',
    );
  });

  test('shows the history of an exercise and its charts', async ({ page }) => {
    await page.getByRole('link', { name: 'Storico' }).click();
    await page.getByRole('link', { name: 'Esercizi', exact: true }).click();
    await expect(page.getByRole('link', { name: /Curl/ })).toBeVisible();
    await page.getByRole('link', { name: /Squat/ }).click();

    await expect(page.getByRole('heading', { name: 'Squat' })).toBeVisible();
    await expect(page.getByText('Sessioni: 4')).toBeVisible();
    await expect(page.getByRole('listitem').first()).toContainText('85 × 8');
    await expect(page.getByRole('listitem').last()).toContainText('80 × 8');

    await page.getByRole('link', { name: 'Vedi i grafici' }).click();
    await expect(page.getByLabel('Esercizio', { exact: true })).toHaveValue('Squat');
    await expect(page.getByLabel('Ripetizioni', { exact: true })).toHaveValue('8');
    await expect(page.getByText('Ultimo a 8 rip')).toBeVisible();
    await expect(page.locator('.tile').first()).toContainText('85 kg');
    await expect(page.getByRole('img', { name: 'Carico a 8 ripetizioni' })).toBeVisible();
    await expect(page.getByRole('img', { name: 'Ripetizioni a settimana' })).toBeVisible();

    const progression = page.getByRole('region', { name: 'Carico a 8 ripetizioni' });
    await progression.getByText('Mostra i dati in tabella').click();
    await expect(progression.getByRole('row')).toHaveCount(5);
    await expect(progression.getByRole('row').last()).toContainText('85');

    const weekly = page.getByRole('region', { name: 'Ripetizioni a settimana' });
    await weekly.getByText('Mostra i dati in tabella').click();
    await expect(weekly.getByRole('row')).toHaveCount(13);
    await expect(weekly.getByRole('row').last()).toContainText('24');

    await page.screenshot({ path: 'test-results/analytics.png', fullPage: true });
  });

  test('switches exercise from the filters', async ({ page }) => {
    await page.getByRole('link', { name: 'Analisi' }).click();
    await page.getByLabel('Esercizio', { exact: true }).selectOption('Curl');
    await expect(page).toHaveURL(/exercise=Curl/);
    await expect(page.getByLabel('Ripetizioni', { exact: true })).toHaveValue('10');
    await expect(page.locator('.tile').first()).toContainText('12 kg per braccio');
  });
});
