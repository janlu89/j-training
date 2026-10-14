/** Columns of the plan CSV, in the documented order. */
export const PLAN_CSV_COLUMNS = [
  'fase',
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
] as const;

export type PlanCsvColumn = (typeof PLAN_CSV_COLUMNS)[number];

export type PlanCsvRow = Readonly<Partial<Record<string, string>>>;
