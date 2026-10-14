# Handoff F3 — Editor schede

Data: 2026-10-14
Branch / ultimo commit: `feature/f2-plans` (PR #6 → `dev`); `dev` contiene F1 (PR #5); `master` = release F0

## Fatto (F2)
- **Archivio schede**: ogni scheda importata resta, con un nome (`Phase.name`); una sola attiva per costruzione.
  Dalla lista e dal dettaglio: **Rendi attiva** / **Archivia**, stato sempre visibile (Attiva / Archiviata).
- **Import CSV** (`/plans/import`): parser puro su PapaParse (`,` `;` tab, virgola decimale, BOM, CRLF), validazione per
  cella con numero di riga del foglio, fasi miste rifiutate, file > 1 MB rifiutati; anteprima con giorni e conteggi,
  nome modificabile, avviso "fase già importata", opzione "usala come scheda attiva"; link **Scarica una scheda di esempio**
  (`public/examples/scheda-esempio.csv`).
- **Transazione unica** (`PlanRepository.savePlan`): archivia l'attiva + crea fase, giorni, esercizi; errore → rollback totale.
- **Allenamento** (`/workout`): mostra **solo il giorno proposto per oggi** (`suggestDay`): giorno associato al giorno della
  settimana corrente → "Allenamento di oggi"; associazioni presenti ma non oggi → "Oggi riposo" + prossimo previsto;
  nessuna associazione → rotazione dopo l'ultima sessione (pronta per F4). Selettore G1/G2/… per scegliere un altro giorno.
- **Dettaglio scheda** (`/plans/:id`): tutti i giorni ripiegabili, giorno della settimana modificabile.
- **Navigazione**: Allenamento · Schede · Storico · Analisi; impostazioni con l'ingranaggio nell'header.
- **E2E** Playwright 1.63 (profilo Pixel 7, locale it-IT, orologio fisso) anche in CI.

## Decisioni prese (con il perché)
- **Fasi riviste con Gianluca** (`docs/piano-sviluppo.md`): F3 diventa "Editor schede" (anche senza CSV); F4 include
  salva/salta giornata e modifica rapida della posizione attrezzi; F5 cronometro per singolo esercizio.
- **Etichetta "Giorno N" non salvata**: derivata da `ordine` via i18n (`TrainingDay.label` rimosso).
- **`PlanRepository` aggregato** accanto ai repository per tabella: possiede letture multi-tabella e transazioni
  dell'invariante "una sola scheda attiva".
- **`suggestDay` pura + `CLOCK` injection token**: logica di "oggi" testabile senza date reali; `linkedSignal` per la
  selezione del giorno (segue il suggerimento finché l'utente non sceglie).
- **PapaParse** dichiarato in `allowedCommonJsDependencies` (solo UMD); è nel chunk lazy della pagina di import.
- **Playwright 1.63.0** e non 1.64.x: versioni più recenti pubblicate da meno di due settimane.
- **Accessibilità**: le icone font (`pButtonIcon`, glifi CSS) finivano nel nome accessibile → `aria-hidden` ovunque;
  `<select>` con `[selected]` sulle option (il `[value]` sulla select arriva prima delle option).
- **Link-pulsante**: lo stile globale dei link esclude `.p-button`.

## File creati/modificati (percorsi)
- `src/app/core/models/{phase,training-day,plan,plan-import}.model.ts`
- `src/app/core/repositories/plan.repository.ts`
- `src/app/core/services/{plan-import.service,workout-plan.service,day-suggestion,clock}.ts`, `plan-csv/*`
- `src/app/features/workout/**`, `src/app/features/plans/**`
- `src/app/shared/ui/{plan-days,exercise-item}/**`, `src/app/shared/pipes/*`, `src/styles/_page.scss`
- `e2e/**`, `playwright.config.ts`, `.github/workflows/ci.yml`, `public/examples/scheda-esempio.csv`
- `docs/piano-sviluppo.md`, `docs/piano-architettura.md`

## Stato test (unit / e2e / manuale)
- Unit: 81/81 (parser, transazioni e rollback, attiva/archivia, suggerimento del giorno, servizi, shell).
- E2E: 8/8 (import, solo il giorno di oggi, scelta di un altro giorno, riposo, archivio attiva/archivia,
  esempio scaricabile, errori del file, giorno della settimana persistente).
- Manuale: browser integrato a 375 px ok. Telefono reale: ok (Gianluca, 2026-10-14). Richiesta: la scelta del giorno
  diventi una lista di etichette con pulsante ▶ verso la pagina dedicata del giorno → pianificata in F4.

## Problemi aperti / debito tecnico
- **Licenza MIT** da aggiungere.
- **Release su `master`** di F1+F2 da fare (merge accorpati).
- **APK con Capacitor** (memoria privata dell'app) + backup automatico su file: decisione per F7/F8.
- **Eliminazione scheda** non ancora disponibile: arriva con l'editor (F3).

## Prossima fase: obiettivo e primo passo
**F3 — Editor schede**, per chi non ha un CSV e per correggere le schede importate:
- **Scheda**: crea da zero (nome, fase, giorni), rinomina, elimina (con conferma; se ha sessioni registrate, proporre
  di archiviarla invece di eliminarla, per non perdere lo storico).
- **Giorni**: aggiungi, rinomina il giorno originale (`csvGiorno`), riordina, elimina (con i suoi esercizi), giorno della settimana.
- **Esercizi**: aggiungi, modifica tutti i campi (nome, tipo, attrezzo, serie, ripetizioni, **posizione attrezzi**,
  ultimo kg, unità di carico, **recupero**, RIR, stato, note), riordina, sposta in un altro giorno, elimina.
  Eliminazione = stato `rimosso` (soft delete, storico intatto); i 4 stati selezionabili.
- **Default di recupero per tipo** (promessa agli amici di Gianluca): scegliendo il tipo nel form, se il recupero non è
  stato toccato si propone **multiarticolare 150 s**, **isolamento 75 s**; sempre modificabile.
- `isManual: true` per gli esercizi creati nell'editor.
- Form con validazione e messaggi tradotti; mobile first (form a tutta larghezza, tastiera numerica per i numeri).

Primo passo: branch `feature/f3-editor` da `dev` aggiornato (dopo il merge della PR #6); definire nel `PlanRepository`
le operazioni di scrittura (createPlan vuota, rename, delete con controllo sessioni, add/update/reorder/delete di
giorni ed esercizi) con test su fake-indexeddb, poi le pagine `/plans/new` e `/plans/:id/edit`.
