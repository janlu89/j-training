import { TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import { CellValue, Workbook, Worksheet } from 'exceljs';
import { firstValueFrom } from 'rxjs';
import { planRecords } from '../../testing/plan-records';
import { provideTranslocoForTests } from '../../testing/transloco-testing';
import { Translate, buildPlanWorkbook } from './plan-xlsx-export';

async function translator(lang: 'it' | 'en'): Promise<Translate> {
  TestBed.configureTestingModule({ providers: [provideTranslocoForTests(lang)] });
  const transloco = TestBed.inject(TranslocoService);
  await firstValueFrom(transloco.load(lang));
  return (key, params) => transloco.translate(key, params);
}

async function workbook(lang: 'it' | 'en' = 'it'): Promise<Workbook> {
  const blob = await buildPlanWorkbook(planRecords(), await translator(lang));
  const loaded = new Workbook();
  await loaded.xlsx.load(await blob.arrayBuffer());
  return loaded;
}

/** The values of a row, blank cells as `null`. */
function values(sheet: Worksheet, row: number): CellValue[] {
  return Array.from(
    { length: sheet.columnCount },
    (_, index) => sheet.getRow(row).getCell(index + 1).value,
  );
}

describe('buildPlanWorkbook', () => {
  it('writes the plan and the sets on two sheets named in the app language', async () => {
    const book = await workbook();

    expect(book.worksheets.map((sheet) => sheet.name)).toEqual(['Scheda', 'Serie']);
    expect(values(book.getWorksheet('Scheda')!, 1)).toEqual([
      'Giorno',
      'Esercizio',
      'Tipo',
      'Attrezzo',
      'Serie',
      'Ripetizioni',
      'Posizione',
      'Carico (kg)',
      'Unità',
      'Recupero (s)',
      'RIR',
      'Stato',
      'Note',
    ]);
    expect(values(book.getWorksheet('Serie')!, 1)).toEqual([
      'Data',
      'Giorno',
      'Esercizio',
      'Serie',
      'kg',
      'Unità',
      'Ripetizioni',
    ]);
  });

  it('lists the visible exercises with translated values and real numbers', async () => {
    const plan = (await workbook()).getWorksheet('Scheda')!;

    expect(plan.rowCount).toBe(4);
    expect(values(plan, 2)).toEqual([
      'Giorno 1 · sabato',
      'Squat',
      'multiarticolare',
      'bilanciere',
      3,
      '8-10',
      null,
      82.5,
      'totale',
      120,
      '2',
      'Attivo',
      null,
    ]);
    expect(values(plan, 4).slice(0, 2)).toEqual(['Giorno 2', 'Plank']);
    expect(plan.getRow(4).getCell(8).value).toBeNull();
    expect(plan.getRow(4).getCell(9).value).toBe('per braccio');
    expect(plan.getRow(4).getCell(12).value).toBe('Da testare');
  });

  it('lists every set as a diary with calendar dates', async () => {
    const sets = (await workbook()).getWorksheet('Serie')!;

    expect(sets.rowCount).toBe(7);
    expect(values(sets, 2)).toEqual([
      new Date(Date.UTC(2026, 9, 6)),
      'Giorno 1 · sabato',
      'Squat',
      1,
      80,
      'totale',
      10,
    ]);
    expect(sets.getRow(2).getCell(1).numFmt).toBe('dd/mm/yyyy');
    // Started just after midnight: the local calendar day.
    expect(sets.getRow(6).getCell(1).value).toEqual(new Date(Date.UTC(2026, 9, 14)));
    expect(values(sets, 7).slice(1, 3)).toEqual(['Giorno eliminato dalla scheda', 'Stacco']);
  });

  it('is ready to print and to filter', async () => {
    const book = await workbook();
    const [plan, sets] = book.worksheets;

    expect(plan.views[0]).toMatchObject({ state: 'frozen', ySplit: 1 });
    expect(plan.autoFilter).toBe('A1:M1');
    expect(plan.getRow(1).font?.bold).toBe(true);
    expect(plan.pageSetup).toMatchObject({
      orientation: 'landscape',
      fitToWidth: 1,
      fitToHeight: 0,
      printTitlesRow: '1:1',
    });
    expect(sets.pageSetup.orientation).toBe('portrait');
    expect(plan.headerFooter.oddHeader).toBe('&LLuglio&RFase 7');
    expect(plan.headerFooter.oddFooter).toBe('&CPagina &P di &N');
  });

  it('follows the English UI', async () => {
    const book = await workbook('en');
    const sets = book.getWorksheet('Sets')!;

    expect(book.worksheets.map((sheet) => sheet.name)).toEqual(['Plan', 'Sets']);
    expect(sets.getRow(2).getCell(1).numFmt).toBe('yyyy-mm-dd');
    expect(book.getWorksheet('Plan')!.getRow(4).getCell(9).value).toBe('per arm');
  });
});
