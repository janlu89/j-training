import { Entity } from './entity.model';

/** `rimosso` is a soft delete: hidden from the plan, history preserved. */
export type ExerciseStatus = 'attivo' | 'da_testare' | 'sospeso' | 'rimosso';

/** Load is either the total weight or the weight per arm. */
export type LoadUnit = 'totale' | 'per_braccio';

/** A planned exercise. What is actually performed is recorded in `SetLog`. */
export interface Exercise extends Entity {
  phaseId: number;
  dayId: number;
  ordine: number;
  esercizio: string;
  tipo: string;
  attrezzo: string;
  serie: number;
  /** Free text: a number, a range ("8-10") or a pyramid scheme. */
  rip: string;
  posizione: string;
  /** Empty in the CSV for exercises still to be tested. */
  ultimoKg: number | null;
  unitaCarico: LoadUnit;
  recSec: number | null;
  rir: string;
  stato: ExerciseStatus;
  note: string;
  /** True when added in the app rather than imported from CSV. */
  isManual: boolean;
}
