import { Locator, Page, expect, test } from '@playwright/test';
import { join } from 'node:path';

/** Days "A" and "B" without weekdays: the proposed day follows the rotation. */
const ROTATION_PLAN = join(__dirname, 'fixtures', 'scheda-rotazione.csv');

test.beforeEach(async ({ page }) => {
  // Thursday.
  await page.clock.setFixedTime(new Date('2026-10-15T10:00:00'));
  await page.goto('/plans/import');
  await page.getByTestId('plan-file').setInputFiles(ROTATION_PLAN);
  await page.getByLabel('Nome della scheda').fill('Rotazione');
  await page.getByRole('button', { name: 'Importa', exact: true }).click();
  await expect(page).toHaveURL(/\/workout$/);
});

function dayItem(page: Page, label: string): Locator {
  return page.getByRole('listitem').filter({ hasText: label });
}

async function openDay(page: Page, name: string): Promise<void> {
  await page.getByRole('link', { name: `Inizia ${name}` }).click();
  await expect(page).toHaveURL(/\/workout\/day\/\d+$/);
}

function exercise(page: Page, name: string): Locator {
  return page.getByRole('region', { name });
}

test.describe('workout', () => {
  test('lists the days and proposes the next one in the rotation', async ({ page }) => {
    await expect(page.getByText('Scheda attiva: Rotazione')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Prossimo allenamento' })).toBeVisible();
    await expect(page.getByRole('listitem')).toHaveCount(2);
    await expect(dayItem(page, 'Giorno 1')).toContainText('Prossimo');
    await expect(dayItem(page, 'Giorno 2')).not.toContainText('Prossimo');

    await openDay(page, 'Giorno 1 · A');

    const squat = exercise(page, 'Squat');
    await expect(squat.getByLabel('Serie 1, kg')).toHaveValue('80');
    await expect(squat.getByLabel('Serie 1, ripetizioni')).toHaveValue('8');
    await expect(squat.getByLabel('Serie 3, kg')).toBeVisible();
    await expect(exercise(page, 'Curl')).toContainText('kg/braccio');
  });

  test('keeps every recorded set when the app is closed and saves the day', async ({ page }) => {
    await openDay(page, 'Giorno 1 · A');
    const squat = exercise(page, 'Squat');
    await squat.getByLabel('Serie 1, kg').fill('82,5');
    await squat.getByRole('button', { name: 'Serie 1 fatta' }).click();
    await expect(squat.getByRole('button', { name: 'Serie 1 fatta' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    // The next sets follow the load used today.
    await expect(squat.getByLabel('Serie 2, kg')).toHaveValue('82,5');

    await page.reload();
    await expect(
      exercise(page, 'Squat').getByRole('button', { name: 'Serie 1 fatta' }),
    ).toHaveAttribute('aria-pressed', 'true');

    await page.getByRole('link', { name: 'Allenamento' }).first().click();
    const resume = page.getByRole('region', { name: 'Giornata in corso' });
    await expect(resume).toContainText('Giorno 1 · A');
    await resume.getByRole('link', { name: 'Riprendi' }).click();

    await page.getByRole('button', { name: 'Salva giornata' }).click();
    const dialog = page.getByRole('dialog', { name: 'Salva giornata' });
    await expect(dialog).toContainText('Serie da salvare: 1');
    await expect(
      dialog.getByRole('checkbox', { name: /Salva anche le serie non spuntate \(5\)/ }),
    ).not.toBeChecked();
    await expect(dialog.getByRole('checkbox', { name: /Squat/ })).toBeChecked();
    await expect(dialog).toContainText('80 kg → 82,5 kg');
    await dialog.getByRole('button', { name: 'Salva', exact: true }).click();

    await expect(page).toHaveURL(/\/workout$/);
    await expect(page.getByRole('region', { name: 'Giornata in corso' })).toBeHidden();
    await expect(dayItem(page, 'Giorno 1')).toContainText('Ultimo: 15/10/26 · completato');
    await expect(dayItem(page, 'Giorno 2')).toContainText('Prossimo');

    await page.getByRole('link', { name: 'Schede' }).click();
    await page.getByRole('link', { name: 'Apri' }).click();
    await expect(page.getByText('82,5 kg')).toBeVisible();
  });

  test('saves a day filled in at the end without ticking any set', async ({ page }) => {
    await openDay(page, 'Giorno 1 · A');
    const squat = exercise(page, 'Squat');
    await squat.getByLabel('Serie 1, kg').fill('85');
    await squat.getByRole('button', { name: 'Togli serie' }).click();
    await expect(squat.getByLabel('Serie 3, kg')).toBeHidden();

    await page.getByRole('button', { name: 'Salva giornata' }).click();
    const dialog = page.getByRole('dialog', { name: 'Salva giornata' });
    await expect(
      dialog.getByRole('checkbox', { name: /Salva anche le serie non spuntate \(5\)/ }),
    ).toBeChecked();
    await expect(dialog).toContainText('Serie da salvare: 5');
    await expect(dialog).toContainText('80 kg → 85 kg');
    await dialog.getByRole('button', { name: 'Salva', exact: true }).click();

    await expect(page).toHaveURL(/\/workout$/);
    await expect(dayItem(page, 'Giorno 1')).toContainText('Ultimo: 15/10/26 · completato');
    await openDay(page, 'Giorno 1 · A');
    await expect(exercise(page, 'Squat').getByLabel('Serie 1, kg')).toHaveValue('85');
  });

  test('skips a day and moves the rotation on', async ({ page }) => {
    await openDay(page, 'Giorno 1 · A');
    await page.getByRole('button', { name: 'Salta giornata' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Salta' }).click();

    await expect(page).toHaveURL(/\/workout$/);
    await expect(dayItem(page, 'Giorno 1')).toContainText('Ultimo: 15/10/26 · saltato');
    await expect(dayItem(page, 'Giorno 2')).toContainText('Prossimo');
  });

  test('edits an exercise mid-workout and comes back with the sets intact', async ({ page }) => {
    await openDay(page, 'Giorno 1 · A');
    const squat = exercise(page, 'Squat');
    await squat.getByRole('button', { name: 'Serie 1 fatta' }).click();
    await expect(squat.getByRole('button', { name: 'Serie 1 fatta' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await squat.getByLabel('Serie 2, kg').fill('85');

    await squat.getByRole('link', { name: 'Modifica Squat' }).click();
    await expect(page.getByRole('heading', { name: 'Modifica esercizio' })).toBeVisible();
    await expect(page.getByRole('link', { name: "Torna all'allenamento" })).toBeVisible();
    await page.getByLabel('Posizione attrezzi').fill('rack 7');
    await page.getByLabel('Serie', { exact: true }).fill('4');
    await page.getByRole('button', { name: 'Salva' }).click();

    await expect(page).toHaveURL(/\/workout\/day\/\d+$/);
    await expect(squat).toContainText('rack 7');
    await expect(squat.getByRole('button', { name: 'Serie 1 fatta' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(squat.getByLabel('Serie 2, kg')).toHaveValue('85');
    await expect(squat.getByLabel('Serie 4, kg')).toBeVisible();
  });

  test('records everything at the end and proposes those loads next time', async ({ page }) => {
    await openDay(page, 'Giorno 2 · B');
    const pullUps = exercise(page, 'Trazioni');
    // Bodyweight: an active exercise without a plan load starts at 0 kg.
    await expect(pullUps.getByLabel('Serie 1, kg')).toHaveValue('0');
    await pullUps.getByRole('button', { name: 'Segna tutte fatte' }).click();
    await expect(pullUps.getByRole('button', { name: 'Serie 3 fatta' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    const latMachine = exercise(page, 'Lat machine');
    await expect(latMachine.getByLabel('Serie 1, kg')).toHaveValue('');
    await expect(latMachine.getByRole('button', { name: 'Serie 1 fatta' })).toBeDisabled();
    await latMachine.getByLabel('Serie 1, kg').fill('45');
    await latMachine.getByRole('button', { name: 'Serie 1 fatta' }).click();

    await page.getByRole('button', { name: 'Salva giornata' }).click();
    const dialog = page.getByRole('dialog', { name: 'Salva giornata' });
    await expect(dialog).toContainText('Carico da testare → 45 kg');
    await dialog.getByRole('button', { name: 'Salva', exact: true }).click();
    await expect(page).toHaveURL(/\/workout$/);

    await openDay(page, 'Giorno 2 · B');
    await expect(exercise(page, 'Lat machine').getByLabel('Serie 1, kg')).toHaveValue('45');
    await expect(exercise(page, 'Lat machine').getByLabel('Serie 2, kg')).toHaveValue('45');
  });

  test('starts the rest when a set is ticked and rings when it is over', async ({ page }) => {
    await page.addInitScript(() => {
      const vibrations: VibratePattern[] = [];
      Object.assign(window, { vibrations });
      navigator.vibrate = (pattern) => vibrations.push(pattern) > 0;
    });
    await page.goto('/workout');
    await openDay(page, 'Giorno 1 · A');

    await exercise(page, 'Squat').getByRole('button', { name: 'Serie 1 fatta' }).click();
    const rest = page.getByRole('region', { name: 'Recupero', exact: true });
    await expect(rest).toContainText('Recupero · Squat');
    await expect(rest.getByRole('timer')).toHaveText('2:30');
    await rest.getByRole('button', { name: 'Aggiungi 15 secondi' }).click();
    await expect(rest.getByRole('timer')).toHaveText('2:45');

    // The rest keeps running while the user looks at another page.
    await page.getByRole('link', { name: 'Schede' }).click();
    await expect(rest.getByRole('timer')).toHaveText('2:45');

    // The alarm starts in the last 5 seconds...
    await page.clock.setFixedTime(new Date('2026-10-15T10:02:41'));
    await expect(rest.getByRole('timer')).toHaveText('0:04');
    const silence = rest.getByRole('button', { name: "Ferma l'allarme" });
    await expect(silence).toBeVisible();

    // ...and keeps ringing after the end, until it is stopped.
    await page.clock.setFixedTime(new Date('2026-10-15T10:03:30'));
    await expect(rest).toContainText('Recupero finito: tocca a te!');
    await expect(silence).toBeVisible();
    const vibrations = () =>
      page.evaluate(() => (window as unknown as { vibrations: VibratePattern[] }).vibrations);
    expect((await vibrations())[0]).toEqual([400, 200, 400]);

    await silence.click();
    await expect(rest).toBeHidden();
    expect((await vibrations()).at(-1)).toEqual([]);
  });

  test('starts a rest by hand and stops it', async ({ page }) => {
    await openDay(page, 'Giorno 1 · A');

    await exercise(page, 'Curl')
      .getByRole('button', { name: 'Avvia recupero di 75 secondi' })
      .click();

    const rest = page.getByRole('region', { name: 'Recupero', exact: true });
    await expect(rest.getByRole('timer')).toHaveText('1:15');
    await rest.getByRole('button', { name: 'Togli 15 secondi' }).click();
    await expect(rest.getByRole('timer')).toHaveText('1:00');
    await rest.getByRole('button', { name: 'Interrompi il recupero' }).click();
    await expect(rest).toBeHidden();
  });

  test('rests before the next exercise, 2 minutes unless changed in the settings', async ({
    page,
  }) => {
    await openDay(page, 'Giorno 1 · A');
    const squat = exercise(page, 'Squat');
    const rest = page.getByRole('region', { name: 'Recupero', exact: true });
    for (const set of [1, 2, 3]) {
      await squat.getByRole('button', { name: `Serie ${set} fatta` }).click();
      await expect(squat.getByRole('button', { name: `Serie ${set} fatta` })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
    }
    await expect(rest).toContainText('Prossimo esercizio · Curl');
    await expect(rest.getByRole('timer')).toHaveText('2:00');
    await rest.getByRole('button', { name: 'Interrompi il recupero' }).click();

    await page.getByRole('link', { name: 'Impostazioni' }).click();
    await page.getByRole('button', { name: '1:30' }).click();
    await expect(page.getByRole('button', { name: '1:30' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await page.goBack();

    await squat.getByRole('button', { name: 'Serie 3 fatta' }).click();
    await expect(squat.getByRole('button', { name: 'Serie 3 fatta' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    await squat.getByRole('button', { name: 'Serie 3 fatta' }).click();
    await expect(rest).toContainText('Prossimo esercizio · Curl');
    await expect(rest.getByRole('timer')).toHaveText('1:30');
  });

  test('allows one workout in progress at a time', async ({ page }) => {
    await openDay(page, 'Giorno 1 · A');
    await exercise(page, 'Squat').getByRole('button', { name: 'Serie 1 fatta' }).click();
    await expect(page.getByText('In corso dal 15/10/26')).toBeVisible();

    await page.getByRole('link', { name: 'Allenamento' }).first().click();
    await openDay(page, 'Giorno 2 · B');
    await expect(page.getByText("C'è una giornata in corso: Giorno 1 · A.")).toBeVisible();
    await expect(exercise(page, 'Trazioni').getByLabel('Serie 1, kg')).toBeDisabled();

    await page.getByRole('button', { name: 'Scarta bozza' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Scarta' }).click();

    await expect(exercise(page, 'Trazioni').getByLabel('Serie 1, kg')).toBeEnabled();
    await page.getByRole('link', { name: 'Allenamento' }).first().click();
    await expect(page.getByRole('region', { name: 'Giornata in corso' })).toBeHidden();
  });
});
