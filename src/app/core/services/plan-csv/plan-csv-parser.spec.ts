import { ImportIssue, ParsedPlan, PlanParseResult } from '../../models';
import { parsePlanCsv } from './plan-csv-parser';
import { weekdayFromText } from './weekday';

const HEADER =
  'fase,giorno,ordine,esercizio,tipo,attrezzo,serie,rip,posizione,ultimo_kg,unita_carico,rec_sec,rir,stato,note';

/** Byte order mark that Excel writes at the start of UTF-8 CSV files. */
const BOM = String.fromCharCode(0xfeff);

function csv(...rows: string[]): string {
  return [HEADER, ...rows].join('\n');
}

function plan(result: PlanParseResult): ParsedPlan {
  if (!result.ok) {
    throw new Error(`Expected a valid plan, got ${JSON.stringify(result.issues)}`);
  }
  return result.plan;
}

function issues(result: PlanParseResult): ImportIssue[] {
  if (result.ok) {
    throw new Error('Expected issues, got a valid plan');
  }
  return result.issues;
}

describe('parsePlanCsv', () => {
  it('maps every column of a valid row', () => {
    const parsed = plan(
      parsePlanCsv(
        csv(
          '7,sabato,1,Panca piana,multiarticolare,bilanciere,4,8-10,piana,62.5,totale,120,2,attivo,"fermo 1"" al petto, lento"',
        ),
      ),
    );

    expect(parsed.fase).toBe(7);
    expect(parsed.exercises).toEqual([
      {
        dayKey: 'sabato',
        ordine: 1,
        esercizio: 'Panca piana',
        tipo: 'multiarticolare',
        attrezzo: 'bilanciere',
        serie: 4,
        rip: '8-10',
        posizione: 'piana',
        ultimoKg: 62.5,
        unitaCarico: 'totale',
        recSec: 120,
        rir: '2',
        stato: 'attivo',
        note: 'fermo 1" al petto, lento',
        isManual: false,
      },
    ]);
  });

  it('numbers the days in order of first appearance and detects the weekday', () => {
    const parsed = plan(
      parsePlanCsv(
        csv(
          '7,sabato,1,Squat,,,3,8,,80,totale,,,attivo,',
          '7,mercoledì,1,Panca,,,3,8,,60,totale,,,attivo,',
          '7,Sabato,2,Affondi,,,3,10,,20,per_braccio,,,attivo,',
          '7,giorno extra,1,Plank,,,3,30s,,,totale,,,attivo,',
        ),
      ),
    );

    expect(parsed.days).toEqual([
      { key: 'sabato', ordine: 1, csvGiorno: 'sabato', weekday: 6 },
      { key: 'mercoledì', ordine: 2, csvGiorno: 'mercoledì', weekday: 3 },
      { key: 'giorno extra', ordine: 3, csvGiorno: 'giorno extra' },
    ]);
    expect(parsed.exercises.map((exercise) => exercise.dayKey)).toEqual([
      'sabato',
      'mercoledì',
      'sabato',
      'giorno extra',
    ]);
  });

  it('treats empty optional cells as unknown and applies defaults', () => {
    const [exercise] = plan(parsePlanCsv(csv('7,sabato,1,Rematore,,,3,10,,,,,,,'))).exercises;

    expect(exercise.ultimoKg).toBeNull();
    expect(exercise.recSec).toBeNull();
    expect(exercise.unitaCarico).toBe('totale');
    expect(exercise.stato).toBe('attivo');
  });

  it('accepts semicolon-separated files with decimal commas, a BOM and CRLF line endings', () => {
    const text = `${BOM}${HEADER.replaceAll(',', ';')}\r\n7;sabato;1;Curl;;;3;12;;12,5;PER_BRACCIO;60;;da_testare;\r\n`;

    const [exercise] = plan(parsePlanCsv(text)).exercises;

    expect(exercise.ultimoKg).toBe(12.5);
    expect(exercise.unitaCarico).toBe('per_braccio');
    expect(exercise.stato).toBe('da_testare');
  });

  it('ignores blank lines', () => {
    expect(
      plan(parsePlanCsv(csv('', '7,sabato,1,Squat,,,3,8,,80,totale,,,attivo,', '  '))).exercises,
    ).toHaveLength(1);
  });

  it('reports an empty file', () => {
    expect(issues(parsePlanCsv(HEADER))).toEqual([{ code: 'emptyFile' }]);
  });

  it('reports missing columns', () => {
    const result = parsePlanCsv('fase,giorno,esercizio\n7,sabato,Squat');
    expect(issues(result)).toEqual([
      {
        code: 'missingColumns',
        value:
          'ordine, tipo, attrezzo, serie, rip, posizione, ultimo_kg, unita_carico, rec_sec, rir, stato, note',
      },
    ]);
  });

  it('reports rows with the wrong number of fields', () => {
    expect(issues(parsePlanCsv(csv('7,sabato,1,Squat')))).toEqual([
      { code: 'malformedRow', row: 2 },
    ]);
  });

  it('reports every invalid cell with its spreadsheet row', () => {
    const result = parsePlanCsv(
      csv('7,sabato,1,Squat,,,3,8,,80,totale,,,attivo,', '7,,x,,,,0,,,tanti,kg,-5,,finito,'),
    );

    expect(issues(result)).toEqual([
      { code: 'required', row: 3, column: 'giorno' },
      { code: 'notInteger', row: 3, column: 'ordine', value: 'x' },
      { code: 'required', row: 3, column: 'esercizio' },
      { code: 'notInteger', row: 3, column: 'serie', value: '0' },
      { code: 'required', row: 3, column: 'rip' },
      { code: 'notNumber', row: 3, column: 'ultimo_kg', value: 'tanti' },
      { code: 'invalidValue', row: 3, column: 'unita_carico', value: 'kg' },
      { code: 'notInteger', row: 3, column: 'rec_sec', value: '-5' },
      { code: 'invalidValue', row: 3, column: 'stato', value: 'finito' },
    ]);
  });

  it('rejects files that mix different phases', () => {
    const result = parsePlanCsv(
      csv(
        '8,sabato,1,Squat,,,3,8,,80,totale,,,attivo,',
        '7,sabato,2,Panca,,,3,8,,60,totale,,,attivo,',
      ),
    );
    expect(issues(result)).toEqual([{ code: 'mixedPhases', value: '7, 8' }]);
  });
});

describe('weekdayFromText', () => {
  it.each([
    ['lunedì', 1],
    ['Martedi', 2],
    [' MERCOLEDÌ ', 3],
    ['domenica', 7],
    ['saturday', 6],
  ])('recognises %s', (text, weekday) => {
    expect(weekdayFromText(text)).toBe(weekday);
  });

  it('returns undefined for free labels', () => {
    expect(weekdayFromText('giorno A')).toBeUndefined();
  });
});
