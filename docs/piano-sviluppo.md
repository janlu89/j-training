# J-Training — Piano di sviluppo per fasi

Ultimo aggiornamento: 2026-10-14 (fasi F2–F5 riviste su richiesta di Gianluca)

## Identità del progetto
- Nome app: J-Training
- Repository GitHub: `j-training` (pubblico, necessario per GitHub Pages gratuito)
- Cartella locale: `A:\Personal dev projects\j-training`
- URL produzione: `https://<utente>.github.io/j-training/` (`base-href` = `/j-training/`)
- Gestione GitHub: GitHub CLI (`gh`), con script versionato in `scripts/`

## Versioni bloccate
- Node 24.x
- Angular 21.2.x e Angular CLI 21 (non 22: PrimeNG 21 richiede @angular/core ^21)
- PrimeNG 21.1.x (MIT) + @primeuix/themes
- @jsverse/transloco 8.x · dexie 4.4.x · papaparse 5.x · exceljs 4.4.x
- Test unitari: Vitest (default di Angular 21) + fake-indexeddb
- E2E: Playwright (da F2)
- Lint: angular-eslint · Formattazione: Prettier

## Branching
- `master`: protetto. Solo PR, nessun push diretto, nessun force push, nessuna cancellazione. Rappresenta la produzione.
- `dev`: protetto con le stesse regole. È il branch di default del repository.
- `feature/fX-descrizione`: merge in `dev` con **squash**.
- Release: PR `dev` → `master` con **merge commit**, così i due branch restano allineati.
- Deploy automatico su GitHub Pages a ogni push su `master`.
- Approvazioni richieste nelle PR: 0. Gianluca lavora da solo e GitHub non permette di approvare le proprie PR. La protezione viene dall'obbligo di PR e dai controlli CI.

## Fasi

| Fase | Obiettivo | Output verificabile |
|---|---|---|
| F0 | Ambiente, scaffold, qualità, repository e protezioni, CI, deploy | `ng serve` funziona; CI verde su PR; Pages pubblica la pagina iniziale |
| F1 | Core: modelli, Dexie, repository, persist storage, i18n ITA/ENG, shell mobile (bottom nav, tema), impostazioni | Cambio lingua a runtime; DB visibile in DevTools > IndexedDB |
| F2 | Import CSV: parsing, validazione, anteprima, transazione archivia/attiva, Giorno 1..N, associazione giorno della settimana. Archivio schede con nome (attiva/archivia). Allenamento mostra solo il giorno suggerito per oggi, con scelta di un altro giorno | Import di una scheda reale; reimport = una sola fase attiva; vecchie schede riattivabili |
| F3 | Editor schede: creazione da zero senza CSV; rinomina/elimina scheda; aggiungi/modifica/riordina/elimina giorni ed esercizi (tutti i campi, inclusi posizione attrezzi e recupero, con default per tipo: multiarticolare 150 s, isolamento 75 s); 4 stati; soft delete | Scheda creata a mano e usabile; CRUD completo; "rimosso" nascosto ma storico intatto |
| F4 | Allenamento: lista dei giorni come etichette con pulsante ▶ che apre la **pagina dedicata del giorno** (proposto quello di oggi); nella pagina del giorno: sessione, log per serie kg/rip, precompilazione, salvataggio delle discrepanze, modifica rapida della posizione attrezzi, **salva giornata** e **salta giornata** (la rotazione avanza) | Sessione completa salvata e riapribile; giornata saltata registrata |
| F5 | Cronometro di recupero per singolo esercizio: Web Worker, timestamp, suono, vibrazione, wake lock, tempo modificabile | Timer preciso anche dopo un breve passaggio in background |
| F6 | Storico per esercizio e analisi: progressione kg a parità di rip, rip settimanali | Grafici con dati di prova realistici |
| F7 | Export CSV/XLSX di fase, backup/restore JSON | File aperti in Excel; restore su un altro browser identico all'originale |
| F8 | PWA e rilascio: service worker, manifest, icone, prompt di installazione, test su Android, v1.0.0 | App installata sul telefono e funzionante offline |

## Strategia di test
- **Unit (Vitest)**: servizi e repository, mapping CSV, regole di precompilazione, calcoli dell'analisi. Dexie testato con fake-indexeddb.
- **Componenti**: solo componenti con logica di presentazione non banale.
- **E2E (Playwright, profilo mobile Pixel)**: da F2 in poi, un flusso principale per fase.
- **Fixture CSV**: anonimizzate e create ad hoc. Il repository è pubblico: la scheda reale di Gianluca non va committata.
- **Test manuale a fine fase**:
  - Desktop: Chrome DevTools in modalità dispositivo.
  - Telefono reale: Debug USB attivo + `chrome://inspect` con port forwarding di `localhost:4200` (il service worker richiede HTTPS o localhost).
  - Dopo il deploy: test sull'URL di GitHub Pages.

## Template handoff (`docs/handoff/handoff-FX.md`)
`handoff-FX.md` è il documento di **ingresso** alla fase X: viene scritto alla fine della fase X-1
e letto all'inizio della sessione della fase X.
```
# Handoff FX — <titolo>
Data:
Branch / ultimo commit:
## Fatto
## Decisioni prese (con il perché)
## File creati/modificati (percorsi)
## Stato test (unit / e2e / manuale)
## Problemi aperti / debito tecnico
## Prossima fase: obiettivo e primo passo
```
