# J-Training — Piano architetturale

Ultimo aggiornamento: 2026-10-14

## Vincoli
- Solo frontend, nessun backend, nessun login. Dati solo sul dispositivo (IndexedDB), mai in cloud.
- Mobile first. Android come target principale; iPhone tramite PWA, non obbligatorio.
- Trasferimento tra dispositivi: export/import JSON completo.
- UI bilingue ITA / ENG, selezionabile a runtime dalle impostazioni.

## Stack
| Area | Scelta | Perché |
|---|---|---|
| Framework | Angular 21.2.x, standalone, zoneless, signals | PrimeNG 21 richiede @angular/core ^21 |
| UI | PrimeNG 21.1.x (MIT) + @primeuix/themes | PrimeNG 22 è passato a licenza commerciale con chiave annuale |
| i18n | @jsverse/transloco 8.x | Cambio lingua a runtime su un solo bundle; @angular/localize richiede un build per lingua |
| Storage | Dexie 4.4.x su IndexedDB + `navigator.storage.persist()` | Asincrono, indicizzato, query reattive con `liveQuery` → `toSignal` |
| CSV | PapaParse 5.x | Parser standard, RFC 4180 |
| Excel | ExcelJS 4.4.x | SheetJS su npm non è aggiornato dal 2022 |
| Grafici | Chart.js tramite PrimeNG Chart | Leggero, sufficiente per lo storico |
| PWA | @angular/pwa | Offline completo, installabile |
| Timer | Web Worker + calcolo su timestamp; suono (prioritario) e vibrazione | I timer sul main thread vengono rallentati in background |
| Hosting | GitHub Pages + GitHub Actions | Gratuito; richiede repository pubblico |
| Routing su Pages | Path routing + copia di `index.html` in `404.html` in fase di deploy | URL puliti; Pages non ha fallback SPA nativo |
| Distribuzione | PWA installabile; APK opzionale via GitHub Releases | Il Play Store per un account personale richiede 25 $ e 12 tester per 14 giorni |

## Decisioni funzionali
1. **Log per singola serie**: kg e rip salvati separatamente per ogni serie (supporta i piramidali).
2. **Precompilazione dei kg**: ultimo kg registrato per quel nome esercizio; se non esiste, `ultimo_kg` della scheda. Sempre modificabile dall'utente.
3. **Stati esercizio**: `attivo`, `da_testare`, `sospeso`, `rimosso`. `rimosso` è un soft delete: l'esercizio sparisce dalla scheda, lo storico resta.
4. **Stato fase**: `active` / `archived`. L'import di una nuova scheda archivia la precedente e attiva la nuova in una sola transazione. Due fasi attive sono impossibili per costruzione.
5. **Giorni di allenamento**: etichette ordinate (Giorno 1, 2, 3...) create dai valori di `giorno` del CSV nell'ordine di prima apparizione. L'utente può associare a ciascuno un giorno della settimana. L'app propone il giorno di oggi: quello associato al giorno della settimana corrente; se gli altri giorni hanno un giorno della settimana ma oggi no, è riposo e propone il prossimo; senza associazioni propone il successivo nella rotazione (dopo l'ultima sessione, completata o saltata). L'utente può sempre scegliere un altro giorno.
6. **Cronometro**: solo recupero tra le serie. Valore predefinito da `rec_sec`, modificabile. Nessun timer di durata sessione per ora.
7. **Storico**: separato per nome esercizio esatto ("Leg press" e "Leg press leggera" sono distinti). L'unità di carico (`totale` / `per_braccio`) è sempre mostrata.
8. **Analisi**: progressione kg a parità di ripetizioni; ripetizioni settimanali per esercizio.

## Formato CSV in ingresso
Colonne: `fase,giorno,ordine,esercizio,tipo,attrezzo,serie,rip,posizione,ultimo_kg,unita_carico,rec_sec,rir,stato,note`
- `fase`: intero, identifica l'iterazione della scheda (cambia ogni mese circa).
- `giorno`: testo libero (es. `sabato`, `domenica`, `mercoledi`).
- `ultimo_kg`: numerico con punto decimale, può essere vuoto (esercizi da testare).
- `unita_carico`: `totale` | `per_braccio`.
- `stato`: nel CSV attuale `attivo` | `da_testare`.
- `note` e `posizione`: testo libero, possono contenere virgole solo se quotate.

## Modello dati
```
Phase        { id, name, fase, status: active|archived, importedAt }
TrainingDay  { id, phaseId, ordine, csvGiorno, weekday? }   // etichetta "Giorno N" tradotta a runtime
Exercise     { id, phaseId, dayId, ordine, esercizio, tipo, attrezzo, serie, rip,
               posizione, ultimo_kg, unita_carico, rec_sec, rir,
               stato: attivo|da_testare|sospeso|rimosso, note, isManual }
Session      { id, phaseId, dayId, startedAt, endedAt?, outcome?: completed|skipped }
SetLog       { id, sessionId, exerciseId, esercizio, fase, date, setNo,
               kg, rip, rir?, unita_carico, recSecUsed?, note? }
```
**Perché**: il piano (`Exercise`) è separato dall'eseguito (`SetLog`), così le discrepanze sono dati e non sovrascritture. `esercizio` e `fase` sono denormalizzati e indicizzati su `SetLog`, quindi lo storico per nome funziona tra fasi diverse senza join.

## Export
- CSV / XLSX di una fase: piano + tutti i SetLog (stampabile, analizzabile da un'AI).
- JSON completo e versionato `{ schemaVersion, exportedAt, phases, days, exercises, sessions, setLogs }` per backup e cambio dispositivo.

## Struttura cartelle
```
src/app/
  core/
    db/            definizione Dexie e versioni dello schema
    models/        tipi del dominio
    repositories/  un repository per tabella
    services/      import, export, timer, analytics, persistence
    i18n/          configurazione Transloco
  features/        import, schedule, workout, exercise, history, analytics, backup, settings
  shared/          componenti presentazionali, pipe
public/i18n/       it.json, en.json
```
**Perché**: `core` contiene singleton e accesso ai dati; le `features` sono rotte lazy e dipendono solo da `core` e `shared`, mai l'una dall'altra. Grafo delle dipendenze aciclico e feature testabili in isolamento.
