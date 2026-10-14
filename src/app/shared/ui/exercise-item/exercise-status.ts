import { ExerciseStatus } from '../../../core/models';

export type StatusSeverity = 'warn' | 'secondary';

const STATUS_SEVERITY: Partial<Record<ExerciseStatus, StatusSeverity>> = {
  da_testare: 'warn',
  sospeso: 'secondary',
};

/** Tag colour of a non-default exercise status; undefined for `attivo`, which shows no tag. */
export function statusSeverity(stato: ExerciseStatus): StatusSeverity | undefined {
  return STATUS_SEVERITY[stato];
}
