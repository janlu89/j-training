import { Page, expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  // Thursday.
  await page.clock.setFixedTime(new Date('2026-10-15T10:00:00'));
});

async function createPlan(page: Page, name: string): Promise<void> {
  await page.goto('/plans/new');
  await page.getByLabel('Nome della scheda').fill(name);
  await page.getByRole('button', { name: 'Crea e aggiungi i giorni' }).click();
  await expect(page.getByRole('heading', { name })).toBeVisible();
}

async function addDay(page: Page, name: string, weekday?: string): Promise<void> {
  await page.getByRole('button', { name: 'Aggiungi giorno' }).click();
  const day = page.getByRole('region').last();
  await day.getByLabel('Nome del giorno').fill(name);
  await day.getByLabel('Nome del giorno').press('Enter');
  if (weekday) {
    await day.getByLabel('Giorno della settimana').selectOption({ label: weekday });
  }
}

async function addExercise(
  page: Page,
  dayIndex: number,
  name: string,
  tipo: string,
): Promise<void> {
  await page
    .getByRole('region')
    .nth(dayIndex)
    .getByRole('link', { name: 'Aggiungi esercizio' })
    .click();
  await page.getByLabel('Esercizio', { exact: true }).fill(name);
  await page.getByLabel('Tipo').fill(tipo);
  await page.getByLabel('Ripetizioni').fill('8-10');
  await page.getByRole('button', { name: 'Salva' }).click();
  await expect(page).toHaveURL(/\/plans\/\d+\/edit$/);
}

test.describe('plan editor', () => {
  test('creates a plan from scratch and trains with it', async ({ page }) => {
    await page.goto('/plans');
    await page.getByRole('link', { name: 'Crea scheda' }).click();
    await createPlan(page, 'Mia scheda');

    await addDay(page, 'Petto e tricipiti', 'Giovedì');
    await addExercise(page, 0, 'Panca piana', 'multiarticolare');
    await addExercise(page, 0, 'Croci ai cavi', 'isolamento');

    // Rest defaults follow the type: 150 s compound, 75 s isolation.
    await expect(page.getByText('Recupero 150 s')).toBeVisible();
    await expect(page.getByText('Recupero 75 s')).toBeVisible();

    await page.getByRole('link', { name: 'Allenamento' }).click();
    await expect(page.getByText('Scheda attiva: Mia scheda')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Allenamento di oggi' })).toBeVisible();
    await expect(page.getByText('Panca piana')).toBeVisible();
  });

  test('edits every field of an exercise, including equipment position and rest', async ({
    page,
  }) => {
    await createPlan(page, 'Posizioni');
    await addDay(page, 'A');
    await addExercise(page, 0, 'Leg press', 'multiarticolare');

    await page.getByRole('link', { name: /Leg press/ }).click();
    await expect(page.getByRole('heading', { name: 'Modifica esercizio' })).toBeVisible();
    await page.getByLabel('Posizione attrezzi').fill('sedile 4, piedi alti');
    await page.getByLabel('Carico (kg)').fill('120');
    await page.getByRole('button', { name: '180 s' }).click();
    await page.getByLabel('Note').fill('discesa lenta');
    await page.getByRole('button', { name: 'Salva' }).click();

    await page.getByRole('link', { name: 'Fine' }).click();
    await expect(page.getByText('sedile 4, piedi alti')).toBeVisible();
    await expect(page.getByText('120 kg')).toBeVisible();
    await expect(page.getByText('Recupero 180 s')).toBeVisible();
    await expect(page.getByText('discesa lenta')).toBeVisible();
  });

  test('reorders, moves and removes exercises', async ({ page }) => {
    await createPlan(page, 'Ordine');
    await addDay(page, 'A');
    await addDay(page, 'B');
    await addExercise(page, 0, 'Uno', 'core');
    await addExercise(page, 0, 'Due', 'core');

    await page.getByRole('button', { name: 'Sposta su Due' }).click();
    const firstDay = page.getByRole('region').nth(0);
    await expect(firstDay.getByRole('listitem').first()).toContainText('Due');

    await page.getByRole('link', { name: /Uno/ }).click();
    await expect(page.getByRole('heading', { name: 'Modifica esercizio' })).toBeVisible();
    await page.getByRole('combobox', { name: /^Giorno/ }).selectOption({ label: 'Giorno 2 · B' });
    await page.getByRole('button', { name: 'Salva' }).click();
    await expect(page.getByRole('region').nth(1)).toContainText('Uno');

    await page.getByRole('link', { name: /Due/ }).click();
    await expect(page.getByRole('heading', { name: 'Modifica esercizio' })).toBeVisible();
    await page.getByRole('button', { name: 'Elimina esercizio' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Elimina' }).click();
    await expect(firstDay).toContainText('Nessun esercizio in questo giorno.');
  });

  test('deletes a plan after confirmation', async ({ page }) => {
    await createPlan(page, 'Da eliminare');
    await page.getByRole('button', { name: 'Elimina scheda' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Elimina' }).click();

    await expect(page).toHaveURL(/\/plans$/);
    await expect(page.getByText('Da eliminare')).toBeHidden();
  });
});
