/**
 * Suggested values for the exercise form. Rest times follow the usual guidance Gianluca promised:
 * compound lifts need 2–3 minutes, isolation work 60–90 seconds.
 */
export const EXERCISE_TYPES = ['multiarticolare', 'isolamento', 'core', 'cardio'] as const;

export const EQUIPMENT = ['bilanciere', 'manubri', 'macchina', 'cavi', 'corpo libero'] as const;

const DEFAULT_REST_SECONDS: Readonly<Record<string, number>> = {
  multiarticolare: 150,
  isolamento: 75,
};

/** Default rest for an exercise type, or undefined when there is no sensible default. */
export function defaultRestFor(tipo: string): number | undefined {
  return DEFAULT_REST_SECONDS[tipo.trim().toLowerCase()];
}
