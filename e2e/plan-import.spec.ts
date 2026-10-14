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

test.beforeEach(async ({ page }) => {
  // Saturday: "scheda-luglio" trains on Saturday, "scheda-piramidali" does not.
  await page.clock.setFixedTime(new Date('2026-10-17T10:00:00'));
});

test.describe('plan import and archive', () => {
  test('starts from an empty workout page that leads to the import', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Nessuna scheda attiva' })).toBeVisible();
    await page.getByRole('link', { name: 'Importa scheda CSV' }).click();
    await expect(page.getByRole('heading', { name: 'Importa scheda' })).toBeVisible();
  });

  test("imports a plan and proposes today's day", async ({ page }) => {
    await page.goto('/plans/import');
    await page.getByTestId('plan-file').setInputFiles(fixture('scheda-luglio.csv'));

    await expect(page.getByText('Fase 7 · Giorni: 3 · Esercizi: 8')).toBeVisible();
    await expect(page.getByLabel('Nome della scheda')).toHaveValue('scheda-luglio');
    await page.getByLabel('Nome della scheda').fill('Luglio');
    await page.getByRole('button', { name: 'Importa', exact: true }).click();

    await expect(page).toHaveURL(/\/workout$/);
    await expect(page.getByText('Scheda attiva: Luglio')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Allenamento di oggi' })).toBeVisible();
    await expect(page.getByRole('listitem')).toHaveCount(3);
    await expect(page.getByRole('listitem').filter({ hasText: 'Giorno 1' })).toContainText('Oggi');

    await page.getByRole('link', { name: 'Inizia Giorno 1 · sabato' }).click();
    await expect(page.getByRole('heading', { name: 'Giorno 1' })).toBeVisible();
    await expect(
      page.getByRole('region', { name: 'Panca piana' }).getByLabel('Serie 1, kg'),
    ).toHaveValue('62,5');
    await expect(page.getByText('Stacco rumeno')).toBeHidden();
  });

  test('lets the user train another day', async ({ page }) => {
    await importPlan(page, 'scheda-luglio.csv', 'Luglio');

    await page.getByRole('link', { name: 'Inizia Giorno 2 · mercoledi' }).click();

    await expect(page.getByRole('heading', { name: 'Giorno 2' })).toBeVisible();
    await expect(page.getByText('Stacco rumeno')).toBeVisible();
    await expect(page.getByText('Da testare', { exact: true })).toBeVisible();
    await expect(page.getByText('Squat')).toBeHidden();
  });

  test('on a rest day proposes the next scheduled workout', async ({ page }) => {
    await importPlan(page, 'scheda-piramidali.csv');

    await expect(page.getByRole('heading', { name: 'Oggi riposo' })).toBeVisible();
    await expect(page.getByText('Prossimo allenamento: Lunedì')).toBeVisible();
  });

  test('keeps every plan, with one active that can be switched or archived', async ({ page }) => {
    await importPlan(page, 'scheda-luglio.csv', 'Luglio');
    await importPlan(page, 'scheda-piramidali.csv', 'Piramidali');

    await page.getByRole('link', { name: 'Schede' }).click();
    const cards = page.getByRole('article');
    const july = page.getByRole('switch', { name: 'Scheda attiva: Luglio' });
    const pyramids = page.getByRole('switch', { name: 'Scheda attiva: Piramidali' });
    await expect(cards).toHaveCount(2);
    await expect(cards.first()).toContainText('Piramidali');
    await expect(pyramids).toBeChecked();
    await expect(july).not.toBeChecked();
    await expect(cards.filter({ hasText: 'Luglio' })).toContainText('Archiviata');

    // Switching a plan on archives the active one: exactly one stays active.
    await july.click();
    await expect(july).toBeChecked();
    await expect(pyramids).not.toBeChecked();
    // Plans keep their place, newest first, whatever their status.
    await expect(cards.first()).toContainText('Piramidali');
    await expect(cards.last()).toContainText('Luglio');
    await page.getByRole('link', { name: 'Allenamento' }).click();
    await expect(page.getByText('Scheda attiva: Luglio')).toBeVisible();

    await page.getByRole('link', { name: 'Schede' }).click();
    await july.click();
    await expect(page.getByRole('switch', { checked: true })).toHaveCount(0);
    await expect(cards.last()).toContainText('Luglio');
    await page.getByRole('link', { name: 'Allenamento' }).click();
    await expect(page.getByRole('heading', { name: 'Nessuna scheda attiva' })).toBeVisible();
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

  test('moving a day to today makes it the workout of the day, and is remembered', async ({
    page,
  }) => {
    await importPlan(page, 'scheda-piramidali.csv');
    await expect(page.getByRole('heading', { name: 'Oggi riposo' })).toBeVisible();

    await page.getByRole('link', { name: 'Schede' }).click();
    await page.getByRole('link', { name: 'Apri' }).click();
    await page.getByLabel('Giorno della settimana').first().selectOption({ label: 'Sabato' });
    await page.getByRole('link', { name: 'Allenamento' }).click();
    await expect(page.getByRole('heading', { name: 'Allenamento di oggi' })).toBeVisible();

    await page.reload();
    await expect(page.getByRole('heading', { name: 'Allenamento di oggi' })).toBeVisible();
    await expect(page.getByRole('listitem').filter({ hasText: 'Giorno 1' })).toContainText(
      'Sabato',
    );
  });
});
