import { EpochMs } from '../models';

/** The local calendar date as `YYYY-MM-DD`: sortable, unambiguous in any language. */
export function isoLocalDate(at: EpochMs): string {
  const date = new Date(at);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}
