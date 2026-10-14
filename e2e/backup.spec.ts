import { Browser, Page, devices, expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const ROTATION_PLAN = join(__dirname, 'fixtures', 'scheda-rotazione.csv');
const TODAY = new Date('2026-10-15T18:00:00');

/** A plan with a saved day (6 sets) and a skipped one, entered through the app's own screens. */
async function seedTrainingData(page: Page): Promise<void> {
  await page.goto('/plans/import');
  await page.getByTestId('plan-file').setInputFiles(ROTATION_PLAN);
  await page.getByLabel('Nome della scheda').fill('Rotazione');
  await page.getByRole('button', { name: 'Importa', exact: true }).click();
  await expect(page).toHaveURL(/\/workout$/);

  await page.getByRole('link', { name: 'Inizia Giorno 1 · A' }).click();
  await page.getByRole('region', { name: 'Squat' }).getByLabel('Serie 1, kg').fill('82,5');
  await page.getByRole('button', { name: 'Salva giornata' }).click();
  await page
    .getByRole('dialog', { name: 'Salva giornata' })
    .getByRole('button', { name: 'Salva', exact: true })
    .click();
  await expect(page).toHaveURL(/\/workout$/);

  await page.getByRole('link', { name: 'Inizia Giorno 2 · B' }).click();
  await page.getByRole('button', { name: 'Salta giornata' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Salta' }).click();
  await expect(page).toHaveURL(/\/workout$/);
}

interface ExportedBackup {
  fileName: string;
  path: string;
  json: Record<string, unknown>;
}

/** Exports a backup from the settings and returns the file name and its JSON content. */
async function exportBackup(page: Page): Promise<ExportedBackup> {
  await page.goto('/settings');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Esporta backup' }).click();
  const file = await download;
  const path = join(test.info().outputDir, file.suggestedFilename());
  await file.saveAs(path);
  await expect(
    page.getByText(`Backup salvato nei download: ${file.suggestedFilename()}`),
  ).toBeVisible();
  return {
    fileName: file.suggestedFilename(),
    path,
    json: JSON.parse(await readFile(path, 'utf-8')),
  };
}

/** A browser that has never opened the app: its own, empty storage. */
async function newBrowserPage(browser: Browser): Promise<Page> {
  const context = await browser.newContext({
    ...devices['Pixel 7'],
    locale: 'it-IT',
    baseURL: test.info().project.use.baseURL,
  });
  const page = await context.newPage();
  await page.clock.setFixedTime(TODAY);
  return page;
}

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(TODAY);
});

test.describe('backup and restore', () => {
  test('restores a backup on another browser identical to the original', async ({
    page,
    browser,
  }) => {
    await seedTrainingData(page);
    const original = await exportBackup(page);
    expect(original.fileName).toBe('j-training-backup-2026-10-15.json');
    expect(original.json).toMatchObject({ schemaVersion: 1 });

    const other = await newBrowserPage(browser);
    await other.goto('/settings');
    await other.getByTestId('backup-file').setInputFiles(original.path);
    const confirm = other.getByRole('alertdialog', { name: 'Ripristinare il backup?' });
    await expect(confirm).toContainText(
      'Backup del 15/10/26 · Schede: 1 · Allenamenti: 2 · Serie: 6.',
    );
    await other.screenshot({ path: 'test-results/backup-confirm.png' });
    await confirm.getByRole('button', { name: 'Sostituisci i dati' }).click();

    // The app restarts on the restored data.
    await expect(other).toHaveURL(/\/settings\?restored=1$/);
    await expect(other.getByText('Backup ripristinato')).toBeVisible();
    await other.getByRole('link', { name: 'Allenamento' }).first().click();
    await expect(other.getByText('Scheda attiva: Rotazione')).toBeVisible();
    await other.getByRole('link', { name: 'Storico' }).click();
    await expect(other.getByRole('listitem')).toHaveCount(2);

    // Every record, ids included, is the same: only the export time may differ.
    const restored = await exportBackup(other);
    const { exportedAt: restoredAt, ...restoredData } = restored.json;
    const { exportedAt: originalAt, ...originalData } = original.json;
    expect(restoredData).toEqual(originalData);
    expect(typeof restoredAt).toBe(typeof originalAt);
    await other.context().close();
  });

  test('refuses a file that is not a backup and keeps the data', async ({ page }) => {
    await seedTrainingData(page);
    await page.goto('/settings');

    await page.getByTestId('backup-file').setInputFiles({
      name: 'scheda.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify({ fase: 9, giorno: 'A' })),
    });

    await expect(page.getByText('Il file non è un backup di J-Training.')).toBeVisible();
    await expect(
      page.getByText('I dati di questo dispositivo non sono stati modificati.'),
    ).toBeVisible();
    await expect(page.getByRole('alertdialog')).toBeHidden();
    await page
      .locator('app-backup-section')
      .screenshot({ path: 'test-results/backup-refused.png' });
    await page.getByRole('link', { name: 'Storico' }).click();
    await expect(page.getByRole('listitem')).toHaveCount(2);
  });
});
