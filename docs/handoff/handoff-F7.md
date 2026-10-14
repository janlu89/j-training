# Handoff F7 — Export e backup

Data: 2026-10-14
Branch / ultimo commit: `feature/f5-rest-timer` (PR → `dev`, contiene **F5 e F6** insieme, su richiesta di
Gianluca); `dev` contiene F1 (#5), F2 (#6), F3 (#7), F4 (#8); `master` = release F0

## Fatto (F5 — Correzioni di F4 e cronometro; F6 — Storico e analisi)
- **Salva giornata anche senza spunte**: il riepilogo propone "Salva anche le serie non spuntate (N)", selezionato
  di default se nessuna serie è spuntata; serie, chiusura e carichi in scheda in un'unica transazione (`saveDay`).
- **Togli serie** accanto ad "Aggiungi serie", anche sotto il numero del piano; l'ultima serie spuntata viene tolta
  insieme alla registrazione.
- **Interfaccia più sobria**: icone piccole in grigio ardesia (▶, ✓, matita, stato vuoto), card "Giornata in corso"
  chiara; area di tocco ≥ 44 px invariata.
- **Schede**: toggle "Attiva" (`ToggleSwitch`) al posto di "Rendi attiva" / "Archivia", in lista e nel dettaglio.
- **Cronometro di recupero**, sempre **avviato a mano** (nessun avvio automatico alla spunta, come chiesto da
  Gianluca): tra le serie dal chip "⏱ N s" dell'esercizio (recupero della scheda), tra gli esercizi dal pulsante
  "⏱ Recupero 2:00" **tra una card esercizio e la successiva** ("Prossimo esercizio · Curl"), **2 minuti di default**
  modificabili in Impostazioni (1:00–3:00). Barra sopra la bottom nav, visibile su tutte le pagine, −15 / +15 / stop.
  Due versioni intermedie (righe tra le serie, avvio automatico all'ultima serie) sono state tolte: non erano ciò che
  Gianluca intendeva.
- **Suono di fine recupero**: negli **ultimi 5 secondi un bip al secondo** (880 Hz), a zero un **"via"** lungo e più
  acuto (1,32 kHz), poi un doppio bip ogni 1,5 s con vibrazione; **si ferma da solo 15 secondi dopo lo zero** (e il
  recupero si chiude) oppure con "Ferma l'allarme"; aggiungere tempo nel conto alla rovescia lo interrompe.
- **Storico** (`/history`): allenamenti salvati e saltati per data (mai le bozze), dettaglio con le serie di ogni
  esercizio in ordine di scheda (`/history/session/:id`), vista Esercizi e storico per nome esatto tra schede
  diverse con il numero di fase (`/history/exercise/:name`); unità di carico sempre visibile.
- **Analisi** (`/analytics`): filtri esercizio e ripetizioni in una riga; riquadri "Ultimo" e "Migliore" a parità di
  ripetizioni; grafico a linea del carico a parità di ripetizioni; colonne delle ripetizioni per settimana (ultime
  12, settimane vuote incluse); ogni grafico ha la tabella con gli stessi dati.

## Decisioni prese (con il perché)
- **Diagnosi della prova F4**: "non salva" significava che lo Storico restava vuoto (era il segnaposto di F6), non un
  errore di salvataggio. La correzione del salvataggio senza spunte resta valida: era una deviazione dalla specifica.
- **PR F4 unita da console** (squash, CI verde) con l'autorizzazione esplicita di Gianluca; F5 ribasata su `dev`.
- **Cronometro su timestamp + Web Worker**: il tempo residuo è sempre `fine − ora`; il worker sveglia la pagina con
  regolarità quando il main thread è rallentato in background. `tsconfig.worker.json` + `webWorkerTsConfig`.
- **Servizio root + barra nella shell**: il recupero sopravvive alla navigazione. Pulsanti nativi nella barra: con
  `ButtonDirective` di PrimeNG il bundle iniziale passava da 599 a 679 kB (budget 650).
- **Audio sbloccato dal tocco che avvia il recupero** (`RestAlarm.prepare`): i browser mobili permettono l'audio solo
  dopo un gesto dell'utente. Nessun file audio: suoni generati e **programmati tutti insieme sull'orologio audio**
  all'inizio del conto alla rovescia, quindi puntuali anche se i timer della pagina sono rallentati.
- **Wake lock** ripreso al ritorno in primo piano e rilasciato quando il recupero si chiude (a mano o da solo).
- **Recupero tra esercizi come preferenza del dispositivo** (`AppSettings.exerciseRestSeconds`, campo non
  indicizzato: nessuna nuova versione Dexie), letto con un `resource` da `RestSettingsService`.
- **Righe di serie come differenza dal piano** (`setDelta` con segno): le modifiche al piano durante l'allenamento
  restano coerenti.
- **`HistoryRepository`** come lato lettura separato (SRP); le bozze sono escluse in un solo punto (`finishedLogs`).
- **Grafici**: Chart.js 4.5 tramite PrimeNG Chart, caricato solo con la pagina Analisi (224 kB, 66 kB gzip).
  Serie singola in arancione 600 (validato sul bianco con lo script della skill dataviz), niente legenda, griglia a
  filo, nessun riempimento sotto la linea (l'asse non parte da zero e l'area esagererebbe), tabella per ogni grafico.
- **Contrasto**: binario del toggle spento ardesia 500 (4,8:1), acceso arancione 600 (3,6:1).
- **Etichette con `for`/`id`** nei filtri di Analisi: una `<select>` dentro la `<label>` aggiunge il valore al nome.

## File creati/modificati (percorsi)
- `src/app/core/services/rest-timer/**` (servizio, worker, ticker, allarme, wake lock), `src/app/core/layout/rest-timer-bar/**`
- `src/app/core/repositories/{workout-session,history}.repository.ts`, `src/app/core/services/analytics/**`
- `src/app/core/models/{rest-timer,history,workout}.model.ts`
- `src/app/features/workout/day/**` (store, righe, log esercizio, riepilogo), `src/app/features/plans/active-switch/**`
- `src/app/core/services/rest-timer/rest-settings.service.ts`, `src/app/features/settings/**`, `src/app/core/models/settings.model.ts`
- `src/app/features/history/**`, `src/app/features/analytics/**`, `src/app/shared/pipes/local-date.pipe.ts`
- `src/app/app.{ts,html,scss}`, `src/styles.scss`, `src/app/core/theme/j-training.preset.ts`
- `angular.json`, `tsconfig*.json`, `package.json` (chart.js), `public/i18n/*.json`
- `e2e/{workout,history,plan-import}.spec.ts`

## Stato test (unit / e2e / manuale)
- Unit: 211/211 (salvataggio atomico con serie non spuntate; cronometro con orologio e ticker finti: conto alla
  rovescia, countdown a −5 s, chiusura da solo 15 s dopo lo zero, +15 che lo ferma, ritorno dal background; suoni
  programmati e vibrazione; wake lock; recupero tra esercizi manuale e impostazione; storico; analisi).
- E2E: 25/25 (salvataggio a fine allenamento e togli serie; nessun recupero automatico alla spunta; recupero a mano
  e "Ferma l'allarme"; countdown e chiusura da solo 15 s dopo lo zero; pulsante tra gli esercizi 2:00 e 1:30 dalle
  impostazioni; toggle schede; storico e analisi con quattro settimane di dati inseriti dall'app).
- Manuale: browser integrato a 390 px ok; screenshot dei grafici dall'E2E (Pixel 7). Telefono reale: ok (Gianluca, 2026-10-14).

## Problemi aperti / debito tecnico
- **Wake lock solo in contesto sicuro**: su `http://192.168.1.231:4200` non è disponibile; da verificare su GitHub
  Pages (HTTPS) o con port forwarding USB su `localhost`.
- **Notifiche con l'app in background**: non previste; richiedono il service worker (F8).
- Valori digitati e non spuntati in memoria (non sopravvivono alla chiusura forzata dell'app).
- Aprendo il form esercizio dall'allenamento la bottom nav evidenzia "Schede".
- Altre `<select>` dentro `<label>` (dettaglio scheda, editor, form esercizio): passare a `for`/`id` come in Analisi.
- **Licenza MIT** da aggiungere. **Release su `master`** di F1–F6 da fare.

## Prossima fase: obiettivo e primo passo
**F7 — Export e backup**: export di una fase in CSV e XLSX (piano + tutti i `SetLog`, stampabile e leggibile da
un'AI) con ExcelJS 4.4; backup JSON completo e versionato `{ schemaVersion, exportedAt, phases, days, exercises,
sessions, setLogs }`; restore su un altro browser identico all'originale (transazione unica, conferma prima di
sovrascrivere).

Primo passo: branch `feature/f7-export` da `dev` aggiornato (dopo il merge della PR F5+F6); `BackupService`
(export/import JSON con validazione dello schema) con test su fake-indexeddb, poi la sezione Backup in Impostazioni.
