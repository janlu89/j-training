import { ImportIssue } from '../../models';
import { PlanCsvColumn, PlanCsvRow } from './plan-csv-columns';

/**
 * Reads typed values from one CSV row and collects an issue for each invalid cell,
 * so that the user sees every problem of the file at once.
 */
export class RowReader {
  constructor(
    private readonly row: PlanCsvRow,
    private readonly rowNumber: number,
    private readonly issues: ImportIssue[],
  ) {}

  text(column: PlanCsvColumn): string {
    return (this.row[column] ?? '').trim();
  }

  requiredText(column: PlanCsvColumn): string {
    const value = this.text(column);
    if (!value) {
      this.report('required', column);
    }
    return value;
  }

  integer(column: PlanCsvColumn, min: number): number {
    const value = this.requiredText(column);
    if (!value) {
      return min;
    }
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < min) {
      this.report('notInteger', column, value);
      return min;
    }
    return parsed;
  }

  optionalInteger(column: PlanCsvColumn, min: number): number | null {
    return this.text(column) ? this.integer(column, min) : null;
  }

  /** Empty means "not yet known". Accepts both "62.5" and "62,5". */
  optionalNumber(column: PlanCsvColumn): number | null {
    const value = this.text(column);
    if (!value) {
      return null;
    }
    const parsed = Number(value.replace(',', '.'));
    if (!Number.isFinite(parsed) || parsed < 0) {
      this.report('notNumber', column, value);
      return null;
    }
    return parsed;
  }

  /** Case-insensitive match against the allowed values; `fallback` is used for empty cells. */
  oneOf<T extends string>(column: PlanCsvColumn, allowed: readonly T[], fallback?: T): T {
    const value = this.text(column).toLowerCase();
    if (!value && fallback) {
      return fallback;
    }
    const match = allowed.find((option) => option === value);
    if (!match) {
      this.report(value ? 'invalidValue' : 'required', column, value || undefined);
      return fallback ?? allowed[0];
    }
    return match;
  }

  private report(code: ImportIssue['code'], column: PlanCsvColumn, value?: string): void {
    this.issues.push({ code, row: this.rowNumber, column, ...(value ? { value } : {}) });
  }
}
