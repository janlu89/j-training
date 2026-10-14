import { NewPlanDay, NewPlanExercise } from './plan.model';

/** Result of parsing a CSV file: the plan content, without name and import date. */
export interface ParsedPlan {
  fase: number;
  days: NewPlanDay[];
  exercises: NewPlanExercise[];
}

export type ImportIssueCode =
  | 'emptyFile'
  | 'fileTooLarge'
  | 'missingColumns'
  | 'malformedRow'
  | 'mixedPhases'
  | 'required'
  | 'notInteger'
  | 'notNumber'
  | 'invalidValue';

/** A problem found in the file. `row` is the spreadsheet row number (header = 1). */
export interface ImportIssue {
  code: ImportIssueCode;
  row?: number;
  column?: string;
  value?: string;
}

export type PlanParseResult = { ok: true; plan: ParsedPlan } | { ok: false; issues: ImportIssue[] };
