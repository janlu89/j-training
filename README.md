# J-Training

App personale per il tracciamento degli allenamenti in palestra, pensata per lo smartphone.
Importa la scheda da CSV, registra kg e ripetizioni per ogni serie, gestisce il recupero
con un cronometro e mostra lo storico e la progressione per esercizio.

**Solo frontend**: nessun backend e nessun login. Tutti i dati restano sul dispositivo (IndexedDB)
e si possono trasferire tra dispositivi con backup ed export.

## Stack

| Area      | Tecnologia                                              |
| --------- | ------------------------------------------------------- |
| Framework | Angular 21 (standalone, zoneless, signals)              |
| UI        | PrimeNG 21                                              |
| i18n      | Transloco (italiano / inglese, cambio lingua a runtime) |
| Storage   | Dexie su IndexedDB                                      |
| Test      | Vitest, Playwright                                      |
| Qualità   | angular-eslint, Prettier                                |
| Hosting   | GitHub Pages tramite GitHub Actions                     |

## Requisiti

- Node.js 24.x
- npm 11.x

## Comandi

| Comando                | Descrizione                                            |
| ---------------------- | ------------------------------------------------------ |
| `npm ci`               | Installa le dipendenze dal lockfile                    |
| `npm start`            | Avvia il server di sviluppo su `http://localhost:4200` |
| `npm test`             | Esegue i test unitari in modalità watch                |
| `npm run test:ci`      | Esegue i test unitari una sola volta (CI)              |
| `npm run lint`         | Analisi statica con angular-eslint                     |
| `npm run format`       | Formatta il codice con Prettier                        |
| `npm run format:check` | Verifica la formattazione senza modificare i file      |
| `npm run build:prod`   | Build di produzione in `dist/`                         |

## Documentazione

- [Piano architetturale](docs/piano-architettura.md): vincoli, stack, modello dati, decisioni funzionali
- [Piano di sviluppo](docs/piano-sviluppo.md): fasi, versioni, branching, strategia di test
- [Handoff](docs/handoff/): stato del progetto all'inizio di ogni fase

## Branching

- `master`: produzione, deploy automatico su GitHub Pages
- `dev`: integrazione, branch di default
- `feature/*`: merge in `dev` con squash; release `dev` → `master` con merge commit
