import { Page, expect, test } from '@playwright/test';
import { join } from 'node:path';

const ROTATION_PLAN = join(__dirname, 'fixtures', 'scheda-rotazione.csv');
const FIRST_WORKOUT = new Date('2026-10-01T18:00:00');

function daysLater(days: number): Date {
  return new Date(FIRST_WORKOUT.getTime() + days * 24 * 60 * 60 * 1000);
}

/** Opens the workout page as on the given day. */
async function openWorkoutOn(page: Page, date: Date): Promise<void> {
  await page.clock.setFixedTime(date);
  await page.goto('/workout');
  await expect(page.getByText('Scheda attiva: Rotazione')).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(FIRST_WORKOUT);
  await page.goto('/plans/import');
  await page.getByTestId('plan-file').setInputFiles(ROTATION_PLAN);
  await page.getByLabel('Nome della scheda').fill('Rotazione');
  await page.getByRole('button', { name: 'Importa', exact: true }).click();
  await expect(page).toHaveURL(/\/workout$/);
  await page.getByRole('link', { name: 'Inizia Giorno 1 · A' }).click();
  await page.getByRole('button', { name: 'Salva giornata' }).click();
  await page
    .getByRole('dialog', { name: 'Salva giornata' })
    .getByRole('button', { name: 'Salva', exact: true })
    .click();
  await expect(page).toHaveURL(/\/workout$/);
});

test.describe('backup reminder', () => {
  test('reminds a week later, can wait another week, and stops once backed up', async ({
    page,
  }) => {
    const reminder = page.getByRole('region', { name: 'È ora di un backup' });
    await expect(page.getByText('Scheda attiva: Rotazione')).toBeVisible();
    await expect(reminder).toBeHidden();

    await openWorkoutOn(page, daysLater(8));
    await expect(reminder).toContainText('Non hai ancora fatto un backup dei tuoi allenamenti');
    await page.screenshot({ path: 'test-results/backup-reminder.png', fullPage: true });
    await reminder.getByRole('button', { name: 'Più tardi' }).click();
    await expect(reminder).toBeHidden();

    await openWorkoutOn(page, daysLater(12));
    await expect(reminder).toBeHidden();

    await openWorkoutOn(page, daysLater(16));
    const download = page.waitForEvent('download');
    await reminder.getByRole('button', { name: 'Esporta backup' }).click();
    expect((await download).suggestedFilename()).toBe('j-training-backup-2026-10-17.json');
    await expect(
      page.getByText('Backup salvato nei download: j-training-backup-2026-10-17.json'),
    ).toBeVisible();

    await page.getByRole('link', { name: 'Impostazioni' }).click();
    await expect(page.getByText('Ultimo backup: oggi')).toBeVisible();

    // Nothing new to save: no reminder, however long ago the backup is.
    await openWorkoutOn(page, daysLater(30));
    await expect(reminder).toBeHidden();
    await page.getByRole('link', { name: 'Impostazioni' }).click();
    await expect(page.getByText('Ultimo backup: 2 settimane fa')).toBeVisible();
  });
});
