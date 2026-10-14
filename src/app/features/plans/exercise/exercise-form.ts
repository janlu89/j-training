import { Validators, FormBuilder } from '@angular/forms';
import { Exercise, ExerciseInput, ExerciseStatus, LoadUnit } from '../../../core/models';

/** Statuses the user can choose; `rimosso` is set by deleting the exercise. */
export const EDITABLE_STATUSES: readonly ExerciseStatus[] = ['attivo', 'da_testare', 'sospeso'];
export const REST_PRESETS = [60, 90, 120, 150, 180] as const;

/** Builds the typed exercise form. */
export function buildExerciseForm(fb: FormBuilder) {
  return fb.nonNullable.group({
    dayId: [0, Validators.required],
    esercizio: ['', [Validators.required, Validators.maxLength(80)]],
    tipo: [''],
    attrezzo: [''],
    serie: [3, [Validators.required, Validators.min(1), Validators.max(20)]],
    rip: ['', [Validators.required, Validators.maxLength(30)]],
    posizione: [''],
    ultimoKg: fb.control<number | null>(null, Validators.min(0)),
    unitaCarico: fb.nonNullable.control<LoadUnit>('totale'),
    recSec: fb.control<number | null>(null, [Validators.min(0), Validators.max(900)]),
    rir: [''],
    stato: fb.nonNullable.control<ExerciseStatus>('attivo'),
    note: [''],
  });
}

export type ExerciseForm = ReturnType<typeof buildExerciseForm>;
export type ExerciseFormValue = ReturnType<ExerciseForm['getRawValue']>;

export function toFormValue(exercise: Exercise): ExerciseFormValue {
  const { id: _id, phaseId: _phaseId, ordine: _ordine, isManual: _isManual, ...fields } = exercise;
  return fields;
}

/** Trims text and normalises empty numbers before saving. */
export function toExerciseInput(value: ExerciseFormValue): ExerciseInput {
  const { dayId: _dayId, ...fields } = value;
  const text = (input: string) => input.trim();
  return {
    ...fields,
    esercizio: text(fields.esercizio),
    tipo: text(fields.tipo),
    attrezzo: text(fields.attrezzo),
    rip: text(fields.rip),
    posizione: text(fields.posizione),
    rir: text(fields.rir),
    note: text(fields.note),
    ultimoKg: fields.ultimoKg ?? null,
    recSec: fields.recSec ?? null,
  };
}
