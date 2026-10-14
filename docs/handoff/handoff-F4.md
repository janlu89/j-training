# Handoff F4 — Allenamento

Data: 2026-10-14
Branch / ultimo commit: `feature/f3-plan-editor` (PR → `dev`); `dev` contiene F1 (#5) e F2 (#6); `master` = release F0

## Fatto (F3 — Editor schede)
- **Crea scheda da zero** (`/plans/new`): nome, fase (proposta = massima + 1), "usala come attiva"; poi editor.
- **Editor** (`/plans/:id/edit`): nome e fase; giorni aggiungi / rinomina (Invio o uscita dal campo salvano) /
  giorno della settimana / ▲▼ / elimina con conferma; esercizi ▲▼ e link al form; elimina scheda con conferma,
  rifiutata se ci sono sessioni registrate (messaggio: archiviala).
- **Form esercizio** (`/plans/:id/days/:dayId/exercises/new`, `/plans/:id/exercises/:exerciseId`): tutti i campi
  (nome, tipo e attrezzo con suggerimenti, **posizione attrezzi**, serie, ripetizioni, carico, unità, **recupero**,
  RIR, stato, giorno per spostarlo, note), validazione tradotta, tastiere numeriche, elimina = `rimosso`.
- **Recupero predefinito per tipo** (`defaultRestFor`): multiarticolare 150 s, isolamento 75 s, finché l'utente non
  imposta il recupero; pulsanti rapidi 60/90/120/150/180 s.
- Punti di ingresso: "Crea scheda" in Schede e in Allenamento vuoto; "Modifica" su ogni scheda e nel dettaglio.

## Decisioni prese (con il perché)
- **`PlanEditorRepository` separato** da `PlanRepository` (letture/import/attivazione): SRP, nessuna God class.
- **Riordino = sposta e rinumera 1..n** (`reorder`, funzione pura): corretto anche con righe CSV con lo stesso `ordine`.
- **Elimina giorno = hard delete** di giorno ed esercizi: lo storico (`SetLog`) ha nome esercizio e fase denormalizzati.
  **Elimina esercizio = soft delete** (`rimosso`), coerente con il piano.
- **Elimina scheda rifiutata se esistono sessioni**: lo storico non si perde per errore; si archivia.
- **Reactive Forms tipizzati** per i form (stabili); signals per lo stato delle pagine; `effect` solo per sincronizzare
  il form con i dati caricati quando l'utente non sta modificando (side effect reale).
- **ESLint `no-unused-vars` con `ignoreRestSiblings`**: `const { id, ...rest } = x` è il modo idiomatico per scartare campi.
- **Pulsanti danger**: rosso 700 al posto del 500 di Aura (bianco su rosso 500 = 3.8:1, su rosso 700 = 6.5:1).
- **ConfirmDialog di PrimeNG** per le eliminazioni (nessuna dipendenza da `@angular/animations`).

## File creati/modificati (percorsi)
- `src/app/core/models/plan-editor.model.ts`, `src/app/core/repositories/plan-editor.repository.ts`
- `src/app/core/services/exercise-defaults.ts`
- `src/app/features/plans/{new,edit,exercise}/**`, `plans-page.*`, `plan-card/*`, `detail/*`, `workout/workout-page.html`
- `src/styles/_form.scss`, `src/app/core/theme/j-training.preset.ts`, `eslint.config.js`, `public/i18n/*.json`
- `e2e/plan-editor.spec.ts`, `src/app/core/testing/fixtures.ts`

## Stato test (unit / e2e / manuale)
- Unit: 94/94 (editor: crea/rinomina/elimina scheda con e senza sessioni, giorni, riordino con `ordine` duplicati,
  sposta esercizio tra giorni, soft delete; recupero predefinito).
- E2E: 12/12 (8 import/archivio + 4 editor: scheda da zero usata in Allenamento, tutti i campi dell'esercizio,
  riordino/spostamento/eliminazione, eliminazione scheda).
- Manuale: DOM verificato a 375 px (nessun overflow). Telefono reale: ESITO_TELEFONO

## Problemi aperti / debito tecnico
- **Licenza MIT** da aggiungere. **Release su `master`** di F1–F3 da fare.
- **APK con Capacitor** + backup automatico su file (F7/F8).
- Le `<select>` dentro `<label>` hanno come nome accessibile etichetta + valore selezionato (comportamento standard):
  valutare `for`/`id` espliciti se si vuole un nome più pulito per gli screen reader.

## Prossima fase: obiettivo e primo passo
**F4 — Allenamento**:
- **Allenamento** diventa la lista dei giorni della scheda attiva come **etichette con pulsante ▶** (richiesta di Gianluca);
  il giorno proposto per oggi (`suggestDay`) è evidenziato. ▶ apre la **pagina dedicata del giorno** (`/workout/day/:dayId`).
- **Pagina del giorno**: avvia la sessione; per ogni esercizio, righe serie con **kg e ripetizioni** precompilate
  (ultimo kg registrato per quel nome, altrimenti `ultimoKg` della scheda); salvataggio delle discrepanze dal piano;
  **modifica rapida della posizione attrezzi**; **Salva giornata** (sessione `completed`) e **Salta giornata**
  (`skipped`): entrambe fanno avanzare la rotazione.
- **Due modi di registrare, entrambi supportati**: serie per serie durante l'allenamento, oppure tutto alla fine
  (es. "oggi faccio il giorno 2, a fine allenamento registro e salvo"). Nessun campo obbligatorio finché non si salva.
- **Bozza sempre salvata**: ogni serie è scritta subito nel DB (sessione senza `endedAt`); chiudendo l'app o con il
  telefono bloccato non si perde nulla. Riaprendo, Allenamento mostra "Giornata in corso — Riprendi".
- **Modifica dell'esercizio durante l'allenamento** (richiesta di Gianluca, 2026-10-14): dalla pagina del giorno si apre
  lo stesso form dell'editor (serie, ripetizioni, recupero, posizione, note, stato…) e al salvataggio si **torna alla
  pagina del giorno** con le serie già inserite intatte (parametro di ritorno nella rotta del form).
- **A fine giornata**: proposta "aggiorna il carico in scheda con quello usato oggi" per gli esercizi in cui il kg
  registrato differisce da `ultimoKg` (l'utente sceglie quali).
- Modello: `Session.outcome?: 'completed' | 'skipped'` (campo non indicizzato: nessuna nuova versione Dexie necessaria).

Primo passo: branch `feature/f4-workout` da `dev` aggiornato; `SessionService` (start, salva set, completa, salta) con
test su fake-indexeddb, poi la nuova pagina Allenamento a lista e la pagina del giorno.
