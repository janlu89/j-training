import Papa from 'papaparse';
import { planRecords } from '../../testing/plan-records';
import { PLAN_EXPORT_CSV_COLUMNS, buildPlanCsv } from './plan-csv-export';

type CsvRow = Record<(typeof PLAN_EXPORT_CSV_COLUMNS)[number], string>;

async function csvRows(): Promise<{ text: string; rows: CsvRow[] }> {
  const blob = buildPlanCsv(planRecords());
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const text = new TextDecoder('utf-8', { ignoreBOM: true }).decode(bytes);
  const parsed = Papa.parse<CsvRow>(text.replace(/^\uFEFF/, ''), {
    header: true,
    skipEmptyLines: true,
  });
  return { text, rows: parsed.data };
}

describe('buildPlanCsv', () => {
  it('writes a UTF-8 CSV with a byte order mark, CRLF lines and stable columns', async () => {
    const { text } = await csvRows();

    expect(buildPlanCsv(planRecords()).type).toBe('text/csv;charset=utf-8');
    expect(text.startsWith('\uFEFF')).toBe(true);
    expect(text.split('\r\n')[0]).toBe(`\uFEFF${PLAN_EXPORT_CSV_COLUMNS.join(',')}`);
  });

  it('puts the plan next to each performed set, with raw machine-readable values', async () => {
    const { rows } = await csvRows();

    expect(rows[1]).toEqual({
      fase: '7',
      scheda: 'Luglio',
      giorno_n: '1',
      giorno: 'sabato',
      ordine: '1',
      esercizio: 'Squat',
      tipo: 'multiarticolare',
      attrezzo: 'bilanciere',
      serie: '3',
      rip: '8-10',
      posizione: '',
      ultimo_kg: '82.5',
      unita_carico: 'totale',
      rec_sec: '120',
      rir: '2',
      stato: 'attivo',
      note: '',
      // The local day of a workout started just after midnight.
      data: '2026-10-14',
      serie_n: '1',
      kg: '82.5',
      rip_fatte: '6',
    });
  });

  it('quotes values containing commas', async () => {
    const { text, rows } = await csvRows();

    expect(text).toContain('"presa larga, gomiti"');
    expect(rows[2].note).toBe('presa larga, gomiti');
  });

  it('leaves the set columns empty for an exercise never trained', async () => {
    const { rows } = await csvRows();
    const plank = rows.find((row) => row.esercizio === 'Plank');

    expect(plank).toMatchObject({ stato: 'da_testare', ultimo_kg: '', rec_sec: '', data: '' });
    expect(plank).toMatchObject({
      unita_carico: 'per_braccio',
      serie_n: '',
      kg: '',
      rip_fatte: '',
    });
  });

  it('keeps the sets of a deleted day with the exercise name they were recorded with', async () => {
    const { rows } = await csvRows();

    expect(rows.at(-1)).toMatchObject({ giorno_n: '', esercizio: 'Stacco', kg: '100' });
  });
});
