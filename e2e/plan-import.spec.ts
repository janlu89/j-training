import { Page, expect, test } from '@playwright/test';
import { join } from 'node:path';

const fixture = (name: string) => join(__dirname, 'fixtures', name);

async function importPlan(page: Page, file: string, name?: string): Promise<void> {
  await page.goto('/plans/import');
  await page.getByTestId('plan-file').setInputFiles(fixture(file));
  if (name) {
    await page.getByLabel('Nome della scheda').fill(name);
  }
  await page.getByRole('button', { name: 'Importa', exact: true }).click();
  await expect(page).toHaveURL(/\/workout$/);
}

test.describe('plan import', () => {
  test('starts from an empty workout page that leads to the import', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Nessuna scheda attiva' })).toBeVisible();
    await page.getByRole('link', { name: 'Importa scheda CSV' }).click();
    await expect(page.getByRole('heading', { name: 'Importa scheda' })).toBeVisible();
  });

  test('previews and imports a plan, which becomes the active one', async ({ page }) => {
    await page.goto('/plans/import');
    await page.getByTestId('plan-file').setInputFiles(fixture('scheda-luglio.csv'));

    await expect(page.getByText('Fase 7 · Giorni: 3 · Esercizi: 8')).toBeVisible();
    await expect(page.getByLabel('Nome della scheda')).toHaveValue('scheda-luglio');
    await page.getByLabel('Nome della scheda').fill('Luglio');
    await page.getByRole('button', { name: 'Importa', exact: true }).click();

    await expect(page).toHaveURL(/\/workout$/);
    await expect(page.getByRole('heading', { name: 'Luglio' })).toBeVisible();
    await expect(page.getByText('Giorno 1', { exact: true })).toBeVisible();
    await expect(page.getByText('62,5 kg')).toBeVisible();
    await expect(page.getByText('Da testare', { exact: true })).toBeVisible();
    // "sabato" in the CSV pre-selects Saturday.
    await expect(page.getByLabel('Giorno della settimana').first()).toHaveValue('6');
  });

  test('keeps every plan and allows exactly one active', async ({ page }) => {
    await importPlan(page, 'scheda-luglio.csv', 'Luglio');
    await importPlan(page, 'scheda-piramidali.csv', 'Piramidali');

    await page.getByRole('link', { name: 'Schede' }).click();
    const cards = page.getByRole('article');
    await expect(cards).toHaveCount(2);
    await expect(cards.first()).toContainText('Piramidali');
    await expect(cards.first()).toContainText('Attiva');

    await cards
      .filter({ hasText: 'Luglio' })
      .getByRole('button', { name: 'Usa questa scheda' })
      .click();

    await expect(page).toHaveURL(/\/workout$/);
    await expect(page.getByRole('heading', { name: 'Luglio' })).toBeVisible();
    await page.getByRole('link', { name: 'Schede' }).click();
    await expect(page.getByText('Attiva', { exact: true })).toHaveCount(1);
  });

  test('offers an example plan that can be imported as is', async ({ page }) => {
    await page.goto('/plans/import');
    const download = page.waitForEvent('download');
    await page.getByRole('link', { name: 'Scarica una scheda di esempio' }).click();
    const file = await (await download).path();

    await page.getByTestId('plan-file').setInputFiles(file);

    await expect(page.getByText('Fase 1 · Giorni: 2 · Esercizi: 6')).toBeVisible();
  });

  test('explains what is wrong in an invalid file', async ({ page }) => {
    await page.goto('/plans/import');
    await page.getByTestId('plan-file').setInputFiles(fixture('scheda-con-errori.csv'));

    const issues = page.getByRole('alert');
    await expect(issues).toContainText('Il file non può essere importato');
    await expect(issues).toContainText('Riga 2:');
    await expect(issues).toContainText('serie: «quattro» non è un numero intero valido.');
    await expect(issues).toContainText('unita_carico: «kg» non è un valore ammesso.');
  });

  test('remembers the weekday assigned to a day', async ({ page }) => {
    await importPlan(page, 'scheda-piramidali.csv');
    const second = page.getByLabel('Giorno della settimana').nth(1);
    await expect(second).toHaveValue('4');

    await second.selectOption({ label: 'Venerdì' });
    await page.reload();

    await expect(page.getByLabel('Giorno della settimana').nth(1)).toHaveValue('5');
  });
});
