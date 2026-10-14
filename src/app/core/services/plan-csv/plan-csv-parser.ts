import Papa from 'papaparse';
import {
  ExerciseStatus,
  ImportIssue,
  LoadUnit,
  NewPlanDay,
  NewPlanExercise,
  PlanParseResult,
} from '../../models';
import { PLAN_CSV_COLUMNS, PlanCsvRow } from './plan-csv-columns';
import { RowReader } from './row-reader';
import { weekdayFromText } from './weekday';

const LOAD_UNITS: readonly LoadUnit[] = ['totale', 'per_braccio'];
const EXERCISE_STATUSES: readonly ExerciseStatus[] = ['attivo', 'da_testare', 'sospeso', 'rimosso'];
/** The header is spreadsheet row 1, so data row i (0-based) is row i + 2. */
const FIRST_DATA_ROW = 2;

/**
 * Parses and validates a plan CSV. Pure: no I/O, no Angular, fully unit-testable.
 * Training days are numbered in order of first appearance of the `giorno` values.
 */
export function parsePlanCsv(text: string): PlanParseResult {
  const parsed = Papa.parse<PlanCsvRow>(text, {
    header: true,
    skipEmptyLines: 'greedy',
    delimitersToGuess: [',', ';', '\t'],
    transformHeader: (header) =>
      header
        .replace(/^\uFEFF/, '')
        .trim()
        .toLowerCase(),
  });

  const structural = structuralIssues(parsed);
  if (structural.length) {
    return { ok: false, issues: structural };
  }

  const issues: ImportIssue[] = [];
  const days = new Map<string, NewPlanDay>();
  const exercises: NewPlanExercise[] = [];
  const phases = new Set<number>();

  parsed.data.forEach((row, index) => {
    const reader = new RowReader(row, index + FIRST_DATA_ROW, issues);
    phases.add(reader.integer('fase', 1));
    const day = dayFor(reader.requiredText('giorno'), days);
    exercises.push(readExercise(reader, day.key));
  });

  if (phases.size > 1) {
    issues.push({ code: 'mixedPhases', value: [...phases].sort((a, b) => a - b).join(', ') });
  }
  if (issues.length) {
    return { ok: false, issues };
  }
  return { ok: true, plan: { fase: [...phases][0], days: [...days.values()], exercises } };
}

function structuralIssues(parsed: Papa.ParseResult<PlanCsvRow>): ImportIssue[] {
  if (!parsed.data.length) {
    return [{ code: 'emptyFile' }];
  }
  const fields = parsed.meta.fields ?? [];
  const missing = PLAN_CSV_COLUMNS.filter((column) => !fields.includes(column));
  if (missing.length) {
    return [{ code: 'missingColumns', value: missing.join(', ') }];
  }
  return parsed.errors
    .filter((error) => error.type === 'FieldMismatch' || error.type === 'Quotes')
    .map((error) => ({ code: 'malformedRow', row: (error.row ?? 0) + FIRST_DATA_ROW }));
}

/** Days are matched case-insensitively ("Sabato" = "sabato") and keep the first spelling. */
function dayFor(csvGiorno: string, days: Map<string, NewPlanDay>): NewPlanDay {
  const key = csvGiorno.toLowerCase();
  let day = days.get(key);
  if (!day) {
    const weekday = weekdayFromText(csvGiorno);
    day = { key, ordine: days.size + 1, csvGiorno, ...(weekday ? { weekday } : {}) };
    days.set(key, day);
  }
  return day;
}

function readExercise(reader: RowReader, dayKey: string): NewPlanExercise {
  return {
    dayKey,
    ordine: reader.integer('ordine', 1),
    esercizio: reader.requiredText('esercizio'),
    tipo: reader.text('tipo'),
    attrezzo: reader.text('attrezzo'),
    serie: reader.integer('serie', 1),
    rip: reader.requiredText('rip'),
    posizione: reader.text('posizione'),
    ultimoKg: reader.optionalNumber('ultimo_kg'),
    unitaCarico: reader.oneOf('unita_carico', LOAD_UNITS, 'totale'),
    recSec: reader.optionalInteger('rec_sec', 0),
    rir: reader.text('rir'),
    stato: reader.oneOf('stato', EXERCISE_STATUSES, 'attivo'),
    note: reader.text('note'),
    isManual: false,
  };
}
