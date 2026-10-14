# Handoff F8 — PWA e rilascio

Data: 2026-10-14
Branch / ultimo commit: `feature/f7-export` (PR → `dev`); `dev` contiene F1–F6 (#5–#9); `master` = release F0

## Fatto (F7 — Export e backup)
- **Backup JSON** da Impostazioni → Backup: file `j-training-backup-AAAA-MM-GG.json` con
  `{ schemaVersion: 1, exportedAt, phases, days, exercises, sessions, setLogs }`, tutti i record con i loro id.
  Le impostazioni del dispositivo (lingua, recupero tra esercizi) non sono incluse.
- **Ripristino da file**: il file viene letto e validato per intero; se è valido una finestra di conferma mostra
  data del backup, schede, allenamenti e serie e avvisa che sostituirà tutti i dati del dispositivo. Confermato,
  il ripristino avviene in **un'unica transazione** e l'app si riavvia su `/settings?restored=1` con il messaggio
  "Backup ripristinato". Un file non valido è rifiutato con il motivo, la posizione del valore errato
  (es. `setLogs[3].kg`) e "I dati di questo dispositivo non sono stati modificati".
- **Export di una scheda** dal dettaglio scheda (sezione "Esporta la scheda"): **Excel** (fogli "Scheda" e "Serie")
  e **CSV** (una tabella con la scheda e tutte le serie salvate), file `Nome - fase N.xlsx|csv`.
- Segnaposto "ESITO_TELEFONO" sostituiti in `handoff-F4.md` (non registrato) e `handoff-F7.md` (ok).

## Decisioni prese (con il perché)
- **Validazione scritta a mano, "parse, don't validate"** (`RecordReader` + un lettore per tabella): ogni record
  viene ricostruito dai soli campi noti, con tipi e valori ammessi; i tipi di ritorno fanno controllare al
  compilatore che nessun campo manchi. Nessuna nuova dipendenza (zod non è nel piano). Si ferma al primo
  problema con il percorso del valore: un file scritto dall'app non ne ha.
- **Integrità prima di scrivere**: id unici per tabella, riferimenti che l'app garantisce
  (`days.phaseId`, `exercises.phaseId/dayId`, `sessions.phaseId`, `setLogs.sessionId`), una sola scheda attiva,
  un solo allenamento in corso. `sessions.dayId` e `setLogs.exerciseId` **possono** puntare a un giorno eliminato
  (lo storico sopravvive alla scheda) e non sono controllati.
- **Versionamento**: `BACKUP_SCHEMA_VERSION = 1`; un file di una versione più recente è rifiutato ("aggiorna
  l'app"), i file più vecchi andranno migrati in `parseBackup` quando la versione salirà.
- **`exportedAt` in ISO 8601** (leggibile aprendo il file), timestamp dei record in epoch ms come salvati:
  il ripristino è identico all'originale.
- **Ripristino atomico con gli id originali** (`BackupRepository.replaceAll`): svuota e reinserisce le 5 tabelle
  in una transazione; un errore a metà annulla tutto (testato). IndexedDB porta avanti il generatore di chiavi
  oltre gli id espliciti, quindi i nuovi record continuano dopo il più alto ripristinato (testato).
- **Riavvio dell'app dopo il ripristino** (`AppRestartService`): lo stato in memoria (serie digitate in
  `WorkoutDrafts`, cronometro) ripartirebbe da id che ora indicano altri record; ricaricare l'app è più semplice
  e sicuro che far invalidare a ogni feature il proprio stato, e non accoppia Impostazioni ad Allenamento.
- **Conferma sempre**, anche su un dispositivo vuoto: regola unica e prevedibile per un'operazione distruttiva;
  `ConfirmDialog` come per le eliminazioni dell'editor.
- **Due formati, due pubblici**. Excel per le persone: intestazioni e valori tradotti (stati, unità, "Giorno 1 ·
  sabato"), numeri e date veri, intestazione bloccata e filtrabile, stampa adattata in larghezza con
  l'intestazione ripetuta, nome scheda e fase nell'intestazione di pagina, "Pagina N di M". CSV per strumenti e AI:
  RFC 4180, colonne stabili con i nomi del formato di import (indipendenti dalla lingua), valori grezzi (codici,
  punto decimale, date ISO), BOM UTF-8 e CRLF.
- **CSV come tabella unica**: una riga per serie eseguita con accanto il piano; un esercizio mai eseguito compare
  una volta senza serie; le serie di esercizi eliminati con il loro giorno chiudono la tabella. Un CSV è una
  tabella: Excel, pandas e un'AI la leggono senza casi speciali (scartata l'alternativa a sezioni).
- **Contenuto dell'export**: allenamenti salvati e saltati, mai la bozza in corso (come lo Storico); gli esercizi
  rimossi non sono nel foglio "Scheda" ma le loro serie restano. `rir`, `recSecUsed` e `note` di `SetLog` non sono
  mai valorizzati dall'app: non esportati in CSV/XLSX (il backup JSON li conserva).
- **Date in Excel**: ExcelJS scrive le date in UTC; il giorno di calendario locale viene passato come mezzanotte
  UTC, così un allenamento dopo mezzanotte non finisce sul giorno prima.
- **ExcelJS caricato su richiesta** (`import()` nel servizio): chunk lazy da 947 kB (218 kB gzip) scaricato solo al
  clic su Excel; bundle iniziale 602 kB (budget 650), pagina scheda 16 kB. `exceljs` in
  `allowedCommonJsDependencies`.
- **Download** con `<a download>` e Blob URL revocato dopo 10 s (revocarlo subito può annullare il download su
  alcuni browser mobili). Messaggio con il nome del file salvato, utile sul telefono.
- **Costanti di dominio nei modelli** (`EXERCISE_STATUSES`, `LOAD_UNITS`, `PHASE_STATUSES`, `SESSION_OUTCOMES`,
  `BACKUP_TABLES`): parser CSV, form esercizio e backup usano la stessa fonte.
- **Nessun escape anti-formula nel CSV**: i dati sono dell'utente e il file è pensato per un'AI, dove un apice
  iniziale sarebbe rumore; l'XLSX scrive i testi come testo.

## File creati/modificati (percorsi)
- `src/app/core/models/{backup,plan-export}.model.ts`, costanti in `{exercise,phase,session}.model.ts`
- `src/app/core/repositories/{backup,plan-export}.repository.ts`
- `src/app/core/services/backup/**` (parser, lettore dei record, integrità, servizio)
- `src/app/core/services/plan-export/**` (righe, CSV, XLSX, servizio)
- `src/app/core/services/{file-download.service,app-restart.service,iso-date}.ts`
- `src/app/features/settings/backup/**`, `src/app/features/settings/settings-page.{ts,html}`
- `src/app/features/plans/detail/plan-export/**`, `src/app/features/plans/detail/plan-detail-page.{ts,html}`
- `src/app/shared/pipes/local-date.pipe.ts` (`formatLocalDate`), `src/app/core/testing/plan-records.ts`
- `src/app/core/services/plan-csv/plan-csv-parser.ts`, `src/app/features/plans/exercise/exercise-form*.ts`
- `public/i18n/{it,en}.json`, `angular.json`, `package.json` (exceljs ~4.4.0), `e2e/{backup,plan-export}.spec.ts`

## Stato test (unit / e2e / manuale)
- Unit: 274/274. Backup: round trip identico su database vuoto, sostituzione con gli id originali, id successivi,
  rollback di un ripristino fallito, impostazioni escluse e intatte, file troppo grande non letto, ogni tipo di
  rifiuto con il percorso. Export: righe in ordine di scheda e di diario, CSV riletto con PapaParse, XLSX riletto con
  ExcelJS (fogli, intestazioni, valori tradotti, date locali, stampa, filtri, inglese), nomi file sicuri.
- E2E: 29/29 (+4): backup esportato e ripristinato su **un secondo browser** (contesto Playwright nuovo) e
  riesportato **identico all'originale**; file non di backup rifiutato senza toccare i dati; Excel scaricato e
  riletto; CSV scaricato e verificato riga per riga. Screenshot Pixel 7: conferma, errore, sezione export.
- Manuale: telefono reale: ESITO_TELEFONO.

## Problemi aperti / debito tecnico
- **Bug preesistente dell'editor (F3), E2E instabile**: rinominando un giorno e cambiando subito il giorno della
  settimana, `updateDay` riscrive anche il nome con il valore precedente se la live query non ha ancora
  riemesso (aggiornamento perso). "creates a plan from scratch and trains with it" fallisce circa 1 volta su 90;
  la CI ha 1 retry. Correzione: aggiornare solo il campo cambiato.
- `npm audit`: 2 moderate da `uuid` < 11 dentro ExcelJS (riguarda v3/v5/v6 con `buf`; ExcelJS usa solo v4 e il
  bundle browser ha la sua copia). Nessuna correzione senza tornare a ExcelJS 3.
- Server di sviluppo nella stessa cartella condividono `.angular/cache`: dopo un cambio di dipendenze un server
  già avviato può rompersi (`getBaseHref` di null). Riavviarlo.
- CSV aperto con doppio clic in Excel italiano: il separatore è la virgola e finisce in una colonna; per Excel
  c'è l'XLSX (oppure Dati → Da testo/CSV).
- Selettore file su Android con `accept=".json,application/json"`: da verificare sul telefono.
- Ereditati da F7: wake lock solo su HTTPS; notifiche in background (F8); valori digitati e non spuntati solo in
  memoria; bottom nav su "Schede" nel form esercizio aperto dall'allenamento; altre `<select>` dentro `<label>`;
  **licenza MIT** e **release su `master`** di F1–F7 da fare.

## Prossima fase: obiettivo e primo passo
**F8 — PWA e rilascio**: service worker, manifest, icone, prompt di installazione, test su Android, v1.0.0
(app installata sul telefono e funzionante offline).

Primo passo: branch `feature/f8-pwa` da `dev` aggiornato (dopo il merge della PR F7); `ng add @angular/pwa`, poi
`ngsw-config.json` con il chunk di ExcelJS (947 kB) caricato in modo lazy, così l'export funziona offline senza
appesantire la prima installazione.
