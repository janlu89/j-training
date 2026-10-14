import Papa from 'papaparse';
import { PlanRecords, PlanSetRow } from '../../models';
import { isoLocalDate } from '../iso-date';
import { planSetRows } from './plan-export-rows';

/**
 * Columns of the CSV export. The names are stable and language independent, so scripts and AI
 * prompts keep working whatever the UI language. Plan columns keep the names of the import format,
 * with the plan name and the day number added; the columns of the performed set follow.
 */
export const PLAN_EXPORT_CSV_COLUMNS = [
  'fase',
  'scheda',
  'giorno_n',
  'giorno',
  'ordine',
  'esercizio',
  'tipo',
  'attrezzo',
  'serie',
  'rip',
  'posizione',
  'ultimo_kg',
  'unita_carico',
  'rec_sec',
  'rir',
  'stato',
  'note',
  'data',
  'serie_n',
  'kg',
  'rip_fatte',
] as const;

type CsvValue = string | number | null | undefined;

/** Lets Excel recognise UTF-8, so accented letters are shown correctly. */
const BYTE_ORDER_MARK = '\uFEFF';

/**
 * The plan and its whole history as one RFC 4180 table: one row per performed set, next to what the
 * plan prescribes. Values are raw (codes, `.` as decimal separator, ISO dates) to stay machine
 * readable; the Excel export is the one meant for people.
 */
export function buildPlanCsv(records: PlanRecords): Blob {
  const data = planSetRows(records).map((row) => csvValues(records, row));
  const csv = Papa.unparse(
    { fields: [...PLAN_EXPORT_CSV_COLUMNS], data },
    { newline: '\r\n', quotes: false },
  );
  return new Blob([BYTE_ORDER_MARK, csv, '\r\n'], { type: 'text/csv;charset=utf-8' });
}

function csvValues({ phase }: PlanRecords, { day, exercise, session, set }: PlanSetRow) {
  const values: CsvValue[] = [
    phase.fase,
    phase.name,
    day?.ordine,
    day?.csvGiorno,
    exercise?.ordine,
    exercise?.esercizio ?? set?.esercizio,
    exercise?.tipo,
    exercise?.attrezzo,
    exercise?.serie,
    exercise?.rip,
    exercise?.posizione,
    exercise?.ultimoKg,
    // The unit the kg of the set refer to; the plan's when no set was performed.
    set?.unitaCarico ?? exercise?.unitaCarico,
    exercise?.recSec,
    exercise?.rir,
    exercise?.stato,
    exercise?.note,
    session && isoLocalDate(session.startedAt),
    set?.setNo,
    set?.kg,
    set?.rip,
  ];
  return values.map((value) => value ?? '');
}
