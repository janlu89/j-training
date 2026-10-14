# Handoff F5 — Correzioni di F4 e cronometro di recupero

Data: 2026-10-14
Branch / ultimo commit: `feature/f4-workout` (PR → `dev`); `dev` contiene F1 (#5), F2 (#6), F3 (#7); `master` = release F0

## Fatto (F4 — Allenamento)
- **Allenamento** (`/workout`) è la lista dei giorni della scheda attiva: etichetta "Giorno N", nome, giorno della
  settimana, numero di esercizi, **ultima sessione** ("Ultimo: 15/10/26 · completato/saltato") e pulsante ▶.
  Il giorno proposto (`suggestDay`) è evidenziato con "Oggi" / "Prossimo". Card **"Giornata in corso — Riprendi"**.
- **Pagina del giorno** (`/workout/day/:dayId`): per ogni esercizio piano (serie × rip, recupero, RIR), attrezzo e
  posizione, note, e una riga per serie con **kg** e **ripetizioni** precompilati e **✓**. "Aggiungi serie" oltre il
  piano, "Segna tutte fatte" per registrare tutto a fine allenamento.
- **Precompilazione**: kg dalla serie di oggi già fatta, con i "gradini" della sessione precedente (piramidali:
  60 → 65 l'ultima volta, oggi 62,5 → 67,5); altrimenti la stessa serie dell'ultima sessione con lo stesso nome;
  altrimenti `ultimoKg`; esercizio attivo senza carico = corpo libero (0 kg); "da testare" resta vuoto.
  Ripetizioni dal piano ("8-10" → 8, piramide "12-10-8" → una per serie).
- **Bozza**: la prima serie spuntata crea la sessione (senza `endedAt`), ogni serie è scritta subito nel DB.
  Una sola giornata in corso: aprendo un altro giorno compare l'avviso con "Vai alla giornata in corso" / "Scarta bozza".
- **Salva giornata**: riepilogo con le serie registrate, avviso sulle serie non spuntate e **proposta di aggiornare
  il carico in scheda** (serie più pesante del giorno, tutte selezionate, l'utente sceglie). **Salta giornata** con
  conferma. Entrambe fanno avanzare la rotazione. **Scarta bozza** con conferma.
- **Modifica esercizio durante l'allenamento**: matita → form dell'editor con `?returnTo=/workout/day/:id`; al
  salvataggio si torna alla giornata con serie registrate e valori digitati intatti.
- Testo dei messaggi `warn` portato a contrasto AA nel tema (giallo 800: 6,6:1).

## Decisioni prese (con il perché)
- **`WorkoutSessionRepository` aggregato**: sessioni e serie, transazioni per registra / salva (+ carichi in scheda) /
  salta / scarta; l'invariante "al massimo una sessione aperta" vive in un solo punto. `endedAt` non è indicizzato:
  scansione della tabella, trascurabile per un registro personale (nessuna nuova versione Dexie).
- **`Session.outcome`** (`completed` | `skipped`), non indicizzato. La rotazione considera solo le sessioni concluse:
  una bozza non fa avanzare il giorno proposto.
- **La sessione nasce con la prima serie**: aprire un giorno per guardarlo non lascia bozze vuote; togliere l'ultima
  serie elimina la bozza.
- **Input come testo** (`inputmode="decimal"`), non `type="number"`: il binding non riscrive ciò che l'utente sta
  digitando ("62," verso "62,5") e si accettano virgola e punto.
- **Valori non spuntati in memoria** (`WorkoutDrafts`, root): sopravvivono all'andata e ritorno nel form esercizio,
  non alla chiusura forzata dell'app. Le serie spuntate sono invece nel DB. Persistere anche i valori non spuntati
  avrebbe messo stato dell'interfaccia nel modello dati.
- **Store per pagina** (`WorkoutDayStore`, fornito dalla pagina): dati live + valori digitati con `computed()`;
  funzioni pure per righe, parsing, precompilazione e proposte di carico.
- **`returnTo` in whitelist** (`/workout/day/<numero>`): nessun redirect arbitrario dal parametro di query.
- **Eliminare un giorno chiude la sua bozza come completata** invece di lasciarla orfana.
- **Giorno della settimana** non più modificabile dalla pagina Allenamento (resta nel dettaglio scheda e nell'editor).

## File creati/modificati (percorsi)
- `src/app/core/models/{session,workout}.model.ts`
- `src/app/core/repositories/{workout-session,session,plan-editor}.repository.ts`
- `src/app/core/services/{workout-session,workout-plan}.service.ts`, `src/app/core/services/workout/{set-prefill,load-updates}.ts`
- `src/app/features/workout/**` (lista, `day-item/`, `day/` con store, righe, log esercizio, dialog di fine giornata);
  rimosso `day-picker/`
- `src/app/features/plans/exercise/exercise-form-page.*` (`returnTo`), `src/app/shared/ui/exercise-item/exercise-status.ts`
- `src/app/core/theme/j-training.preset.ts`, `src/app/app.routes.ts`, `public/i18n/*.json`
- `e2e/workout.spec.ts`, `e2e/fixtures/scheda-rotazione.csv`, `e2e/plan-{import,editor}.spec.ts`

## Stato test (unit / e2e / manuale)
- Unit: 161/161 (repository sessioni: bozza, una sola in corso, salva atomico con carichi, salta, scarta, serie
  precedenti; precompilazione e piramidali; proposte di carico; rotazione con giorni saltati; righe e parsing; store).
- E2E: 18/18 (6 nuovi: lista e rotazione, bozza dopo reload e salvataggio con aggiornamento carico, salta, modifica
  esercizio a metà allenamento, tutto a fine allenamento e precompilazione la volta dopo, una sola giornata in corso).
- Manuale: browser integrato a 390 px ok. **Telefono reale (Gianluca, 2026-10-14)**: interfaccia ok, ma **"Salva
  giornata" non salva** nel flusso "compilo tutto a fine allenamento": il pulsante resta disabilitato finché non si
  spunta almeno una serie (riprodotto con tap touch su profilo Pixel 7). È una deviazione dalla specifica F4
  ("nessun campo obbligatorio finché non si salva"): primo punto di F5, come chiesto da Gianluca.

## Problemi aperti / debito tecnico
- **Salva giornata senza spunte** (vedi sopra): da correggere in F5.
- **Licenza MIT** da aggiungere. **Release su `master`** di F1–F4 da fare.
- **APK con Capacitor** + backup automatico su file (F7/F8).
- Aprendo il form esercizio dall'allenamento la bottom nav evidenzia "Schede" (l'URL è `/plans/...`).
- Le `<select>` dentro `<label>` hanno come nome accessibile etichetta + valore selezionato (comportamento standard).

## Prossima fase: obiettivo e primo passo
**F5 — Correzioni dalla prova di F4 + cronometro di recupero** (richieste di Gianluca, 2026-10-14):
1. **Salva giornata anche senza spunte**: nel riepilogo, le serie non spuntate con valori completi si possono salvare
   con i valori mostrati (scelta predefinita quando nessuna serie è spuntata); salvataggio atomico (serie + chiusura
   + carichi in scheda) in un'unica transazione.
2. **Togliere serie** nella sessione, oltre ad aggiungerle (anche sotto il numero previsto dal piano).
3. **UI più moderna**: niente icone grandi e stilizzate (▶ arancioni pieni, ✓ grandi, icona dello stato vuoto);
   icone più piccole e sobrie, in grigio, mantenendo area di tocco ≥ 44 px e contrasto ≥ 3:1 per le icone di controllo.
4. **Schede**: lo stato attiva/archiviata diventa un **toggle** (`ToggleSwitch` di PrimeNG 21) al posto dei pulsanti
   "Rendi attiva" / "Archivia", nella lista e nel dettaglio; resta una sola scheda attiva per costruzione.
5. **Cronometro di recupero** per singolo esercizio (obiettivo originale di F5): Web Worker, calcolo su timestamp,
   suono (prioritario) e vibrazione, wake lock, tempo predefinito da `recSec` modificabile.

Primo passo: branch `feature/f5-rest-timer` (dalla punta di `feature/f4-workout`, da ribasare su `dev` dopo il merge
della PR F4); correzione del salvataggio con test su fake-indexeddb e E2E del flusso "tutto a fine allenamento".
