# J-Training

App personale per il tracciamento degli allenamenti in palestra, pensata per lo smartphone e
installabile come app (PWA). Importa la scheda da CSV o la crea a mano, registra kg e ripetizioni
per ogni serie, gestisce il recupero con un cronometro e mostra storico e progressione per esercizio.

**Solo frontend**: nessun backend e nessun login. Tutti i dati restano sul dispositivo (IndexedDB)
e si spostano tra dispositivi con il backup.

**App**: <https://janlu89.github.io/j-training/>

## Funzionalità

- **Schede**: import da CSV con anteprima e validazione, editor completo (giorni, esercizi, recuperi,
  stati), archivio con una sola scheda attiva.
- **Allenamento**: giorno proposto in base al giorno della settimana o alla rotazione, log per serie con
  precompilazione dei carichi, bozza salvata a ogni serie, salva o salta la giornata.
- **Cronometro di recupero** su timestamp e Web Worker, con suoni negli ultimi secondi, vibrazione e
  schermo sempre acceso.
- **Storico e analisi**: allenamenti per data, storico per esercizio, progressione del carico a parità
  di ripetizioni e ripetizioni settimanali, ogni grafico con la sua tabella.
- **Export e backup**: scheda e serie in Excel (da stampare) o CSV (per un'AI); backup JSON completo e
  versionato, ripristino validato in un'unica transazione; promemoria settimanale se ci sono allenamenti
  non salvati.
- **PWA**: installabile, funziona offline, avvisa quando c'è una nuova versione; italiano e inglese.

## Installazione sul telefono

- **Android (Chrome)**: apri l'app, poi Impostazioni → App → "Installa l'app" (oppure il menu di Chrome →
  "Installa app"). Chrome la installa come app vera, con la sua icona, e protegge i dati dalla pulizia
  automatica del browser.
- **iPhone (Safari)**: Condividi → "Aggiungi alla schermata Home".

Per spostare i dati su un altro dispositivo: Impostazioni → Backup → "Esporta backup", poi
"Ripristina da file" sul nuovo dispositivo.

## Scelte architetturali

| Scelta                                               | Perché                                                                                             |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Standalone, zoneless, signals, OnPush                | Change detection esplicita e prevedibile, nessun NgModule                                          |
| Dexie solo nei repository (regola ESLint)            | I componenti non conoscono lo storage; query reattive con `liveQuery` → `toSignal`                 |
| Piano (`Exercise`) separato dall'eseguito (`SetLog`) | Le discrepanze sono dati, non sovrascritture; storico per nome esercizio tra schede diverse        |
| Transazioni per ogni scrittura multi-tabella         | Invarianti per costruzione: una sola scheda attiva, un solo allenamento in corso                   |
| Validazione "parse, don't validate" del backup       | Un ripristino non può produrre uno stato che l'app non avrebbe potuto creare                       |
| ExcelJS caricato su richiesta                        | ~1 MB scaricato solo al primo export; bundle iniziale sotto i 650 kB                               |
| Service worker Angular con prefetch completo         | Tutto disponibile offline, anche l'export, in palestra senza rete                                  |
| PWA invece di un'app nativa                          | Un solo codice, aggiornamenti automatici, nessun costo di store; archiviazione permanente e backup |

Dettagli in [piano architetturale](docs/piano-architettura.md) e negli [handoff](docs/handoff/).

## Stack

| Area      | Tecnologia                                                   |
| --------- | ------------------------------------------------------------ |
| Framework | Angular 21 (standalone, zoneless, signals), service worker   |
| UI        | PrimeNG 21, Chart.js                                         |
| i18n      | Transloco (italiano / inglese, cambio lingua a runtime)      |
| Storage   | Dexie su IndexedDB                                           |
| File      | PapaParse (CSV), ExcelJS (XLSX)                              |
| Test      | Vitest + fake-indexeddb, Playwright (Pixel 7, anche offline) |
| Qualità   | angular-eslint, Prettier, CI su ogni PR                      |
| Hosting   | GitHub Pages tramite GitHub Actions, deploy a ogni release   |

## Requisiti

- Node.js 24.x
- npm 11.x

## Comandi

| Comando                           | Descrizione                                                  |
| --------------------------------- | ------------------------------------------------------------ |
| `npm ci`                          | Installa le dipendenze dal lockfile                          |
| `npm start`                       | Avvia il server di sviluppo su `http://localhost:4200`       |
| `npm test`                        | Esegue i test unitari in modalità watch                      |
| `npm run test:ci`                 | Esegue i test unitari una sola volta (CI)                    |
| `npm run e2e`                     | Test end-to-end: dev server e build di produzione con la PWA |
| `npm run lint`                    | Analisi statica con angular-eslint                           |
| `npm run format`                  | Formatta il codice con Prettier                              |
| `npm run format:check`            | Verifica la formattazione senza modificare i file            |
| `npm run build:prod`              | Build di produzione in `dist/`                               |
| `npm run build:pages`             | Build di produzione per GitHub Pages (`/j-training/`)        |
| `node scripts/generate-icons.mjs` | Rigenera le icone dell'app da un unico disegno               |

## Documentazione

- [Piano architetturale](docs/piano-architettura.md): vincoli, stack, modello dati, decisioni funzionali
- [Piano di sviluppo](docs/piano-sviluppo.md): fasi, versioni, branching, strategia di test
- [Handoff](docs/handoff/): stato del progetto all'inizio di ogni fase

## Branching

- `master`: produzione, deploy automatico su GitHub Pages
- `dev`: integrazione, branch di default
- `feature/*`: merge in `dev` con squash; release `dev` → `master` con merge commit

## Licenza

[MIT](LICENSE) © 2026 Gianluca Meola
