import { Workbook } from 'exceljs';
import { EpochMs, LoadUnit, PlanRecords, PlanRow, SetRow, TrainingDay } from '../../models';
import { planRows, setRows } from './plan-export-rows';

/** Translation of a UI key: the workbook is written in the language of the app. */
export type Translate = (key: string, params?: Record<string, unknown>) => string;

type Cell = string | number | Date | null;

interface Column<T> {
  /** Suffix of the `planExport.column.*` translation key. */
  key: string;
  width: number;
  value: (row: T, t: Translate) => Cell | undefined;
  date?: true;
  wrap?: true;
}

const PLAN_COLUMNS: readonly Column<PlanRow>[] = [
  { key: 'day', width: 22, value: ({ day }, t) => dayLabel(day, t) },
  { key: 'exercise', width: 26, value: ({ exercise }) => exercise.esercizio },
  { key: 'type', width: 16, value: ({ exercise }) => exercise.tipo },
  { key: 'equipment', width: 14, value: ({ exercise }) => exercise.attrezzo },
  { key: 'sets', width: 7, value: ({ exercise }) => exercise.serie },
  { key: 'reps', width: 12, value: ({ exercise }) => exercise.rip },
  { key: 'position', width: 16, value: ({ exercise }) => exercise.posizione },
  { key: 'load', width: 11, value: ({ exercise }) => exercise.ultimoKg },
  { key: 'unit', width: 12, value: ({ exercise }, t) => unitLabel(exercise.unitaCarico, t) },
  { key: 'rest', width: 13, value: ({ exercise }) => exercise.recSec },
  { key: 'rir', width: 6, value: ({ exercise }) => exercise.rir },
  { key: 'status', width: 12, value: ({ exercise }, t) => t(`exercise.status.${exercise.stato}`) },
  { key: 'note', width: 32, value: ({ exercise }) => exercise.note, wrap: true },
];

const SET_COLUMNS: readonly Column<SetRow>[] = [
  { key: 'date', width: 12, value: ({ session }) => calendarDate(session.startedAt), date: true },
  {
    key: 'day',
    width: 22,
    value: ({ day }, t) => (day ? dayLabel(day, t) : t('history.deletedDay')),
    wrap: true,
  },
  // The name the set was recorded with: the same one the history uses.
  { key: 'exercise', width: 26, value: ({ set }) => set.esercizio },
  { key: 'set', width: 7, value: ({ set }) => set.setNo },
  { key: 'kg', width: 8, value: ({ set }) => set.kg },
  { key: 'unit', width: 12, value: ({ set }, t) => unitLabel(set.unitaCarico, t) },
  { key: 'reps', width: 12, value: ({ set }) => set.rip },
];

const XLSX_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/**
 * The plan and every saved set as an Excel workbook meant for people: translated headers and
 * values, real numbers and dates, a frozen and filterable header, pages fitted to the width with
 * the header repeated, and the plan name in the page header when printed.
 */
export async function buildPlanWorkbook(records: PlanRecords, t: Translate): Promise<Blob> {
  const workbook = new Workbook();
  workbook.creator = 'J-Training';
  workbook.title = records.phase.name;
  addSheet(workbook, records, t, 'plan', PLAN_COLUMNS, planRows(records));
  addSheet(workbook, records, t, 'sets', SET_COLUMNS, setRows(records));
  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], { type: XLSX_TYPE });
}

function addSheet<T>(
  workbook: Workbook,
  { phase }: PlanRecords,
  t: Translate,
  name: 'plan' | 'sets',
  columns: readonly Column<T>[],
  rows: readonly T[],
): void {
  const sheet = workbook.addWorksheet(t(`planExport.sheet.${name}`), {
    views: [{ state: 'frozen', ySplit: 1 }],
    pageSetup: {
      orientation: columns.length > 8 ? 'landscape' : 'portrait',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      printTitlesRow: '1:1',
    },
    headerFooter: {
      oddHeader: `&L${pageText(phase.name)}&R${pageText(t('plans.fase', { fase: phase.fase }))}`,
      oddFooter: `&C${t('planExport.page')}`,
    },
  });
  sheet.columns = columns.map((column) => ({
    header: t(`planExport.column.${column.key}`),
    key: column.key,
    width: column.width,
    style: {
      ...(column.date ? { numFmt: t('planExport.dateFormat') } : {}),
      alignment: { vertical: 'top', ...(column.wrap ? { wrapText: true } : {}) },
    },
  }));
  sheet.addRows(rows.map((row) => columns.map((column) => cell(column.value(row, t)))));
  sheet.getRow(1).font = { bold: true };
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } };
}

/** Missing and empty values are written as blank cells, not as empty texts. */
function cell(value: Cell | undefined): Cell {
  return value === undefined || value === '' ? null : value;
}

function dayLabel(day: TrainingDay, t: Translate): string {
  const label = t('plan.day', { number: day.ordine });
  return day.csvGiorno ? `${label} · ${day.csvGiorno}` : label;
}

function unitLabel(unit: LoadUnit, t: Translate): string {
  return t(`planExport.unit.${unit}`);
}

/**
 * Excel dates have no time zone and ExcelJS writes JS dates as UTC: the local calendar day is
 * passed as midnight UTC, so a late-evening workout is not shown on the next or previous day.
 */
function calendarDate(at: EpochMs): Date {
  const local = new Date(at);
  return new Date(Date.UTC(local.getFullYear(), local.getMonth(), local.getDate()));
}

/** `&` starts a code in Excel page headers: a literal one is written twice. */
function pageText(text: string): string {
  return text.replaceAll('&', '&&');
}
