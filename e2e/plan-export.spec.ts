import { Page, expect, test } from '@playwright/test';
import { Workbook } from 'exceljs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const ROTATION_PLAN = join(__dirname, 'fixtures', 'scheda-rotazione.csv');

/** Clicks an export button and returns the downloaded file. */
async function download(page: Page, button: string): Promise<{ name: string; path: string }> {
  const event = page.waitForEvent('download');
  await page.getByRole('button', { name: button, exact: true }).click();
  const file = await event;
  const path = join(test.info().outputDir, file.suggestedFilename());
  await file.saveAs(path);
  return { name: file.suggestedFilename(), path };
}

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-15T18:00:00'));
  await page.goto('/plans/import');
  await page.getByTestId('plan-file').setInputFiles(ROTATION_PLAN);
  await page.getByLabel('Nome della scheda').fill('Rotazione');
  await page.getByRole('button', { name: 'Importa', exact: true }).click();
  await expect(page).toHaveURL(/\/workout$/);

  await page.getByRole('link', { name: 'Inizia Giorno 1 · A' }).click();
  const squat = page.getByRole('region', { name: 'Squat' });
  for (const set of [1, 2, 3]) {
    await squat.getByLabel(`Serie ${set}, kg`).fill('82,5');
  }
  await page.getByRole('button', { name: 'Salva giornata' }).click();
  await page
    .getByRole('dialog', { name: 'Salva giornata' })
    .getByRole('button', { name: 'Salva', exact: true })
    .click();
  await expect(page).toHaveURL(/\/workout$/);

  await page.getByRole('link', { name: 'Schede' }).click();
  await page.getByRole('link', { name: 'Apri' }).click();
  await expect(page.getByRole('heading', { name: 'Rotazione' })).toBeVisible();
});

test.describe('plan export', () => {
  test('exports the plan and its sets to an Excel workbook', async ({ page }) => {
    const section = page.getByRole('region', { name: 'Esporta la scheda' });
    await section.scrollIntoViewIfNeeded();
    await page.screenshot({ path: 'test-results/plan-export.png', fullPage: true });

    const file = await download(page, 'Excel');

    expect(file.name).toBe('Rotazione - fase 9.xlsx');
    await expect(section).toContainText('File salvato nei download: Rotazione - fase 9.xlsx');
    const book = new Workbook();
    await book.xlsx.load(await readFile(file.path));
    expect(book.worksheets.map((sheet) => sheet.name)).toEqual(['Scheda', 'Serie']);
    const plan = book.getWorksheet('Scheda')!;
    expect(plan.rowCount).toBe(5);
    expect(plan.getRow(2).getCell(1).value).toBe('Giorno 1 · A');
    expect(plan.getRow(5).getCell(12).value).toBe('Da testare');
    const sets = book.getWorksheet('Serie')!;
    expect(sets.rowCount).toBe(7);
    expect(sets.getRow(2).getCell(1).value).toEqual(new Date(Date.UTC(2026, 9, 15)));
    expect(sets.getRow(2).getCell(3).value).toBe('Squat');
    expect(sets.getRow(2).getCell(5).value).toBe(82.5);
  });

  test('exports the plan and its sets to a CSV for other tools', async ({ page }) => {
    const file = await download(page, 'CSV');

    expect(file.name).toBe('Rotazione - fase 9.csv');
    const lines = (await readFile(file.path, 'utf-8'))
      .replace(/^\uFEFF/, '')
      .trim()
      .split('\r\n');
    expect(lines[0]).toBe(
      'fase,scheda,giorno_n,giorno,ordine,esercizio,tipo,attrezzo,serie,rip,posizione,' +
        'ultimo_kg,unita_carico,rec_sec,rir,stato,note,data,serie_n,kg,rip_fatte',
    );
    // Header, 6 performed sets of day A, the two exercises of day B never trained.
    expect(lines).toHaveLength(9);
    expect(lines[1]).toBe(
      '9,Rotazione,1,A,1,Squat,multiarticolare,bilanciere,3,8,,82.5,totale,150,2,attivo,,2026-10-15,1,82.5,8',
    );
    expect(lines.at(-1)).toBe(
      '9,Rotazione,2,B,2,Lat machine,multiarticolare,macchina,3,10-12,presa larga,,totale,90,2,da_testare,,,,,',
    );
  });
});
