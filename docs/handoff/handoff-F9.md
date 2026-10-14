# Handoff F9 — APK Android (TWA)

Data: 2026-10-15
Branch / ultimo commit: `feature/f8-pwa` (PR → `dev`), poi release `dev` → `master` = **v1.0.0**; `dev` contiene
F1–F7 (#5–#10); prima di questa release `master` conteneva solo F0

## Fatto (F8 — PWA e rilascio)
- **Ultimo backup** in Impostazioni → Backup: "Ultimo backup: 3 giorni fa" (oggi, ieri, giorni, settimane, mesi,
  nella lingua dell'app) oppure "Nessun backup ancora da questo dispositivo".
- **Promemoria di backup** in fondo alla pagina Allenamento, solo se ci sono allenamenti salvati o saltati che
  nessun backup contiene, ad almeno una settimana dall'ultimo backup (o dal primo di quegli allenamenti, se non è
  mai stato fatto un backup). "Esporta backup" a un tocco; "Più tardi" lo rimanda di una settimana. Ripristinare
  un backup conta come backup fatto alla data del file.
- **PWA**: service worker di Angular con tutti i file dell'app in cache all'installazione (anche ExcelJS,
  traduzioni e font delle icone), manifest (`standalone`, blu `#14213d`, icone normali e maskable), funziona
  offline anche aprendo un indirizzo interno (es. `/plans`).
- **Icone** disegnate una volta in SVG (barra arancione e "J", come nell'header) e generate in PNG da
  `scripts/generate-icons.mjs`; via la vecchia `favicon.ico` con il logo di Angular.
- **Impostazioni → App**: "Installa l'app" quando il browser lo permette, istruzioni per iPhone, stato
  "Stai usando l'app installata", **versione 1.0.0**. Dopo l'installazione l'app chiede di nuovo l'archiviazione
  permanente.
- **Nuova versione disponibile**: barra sotto l'header con "Aggiorna" quando il service worker ha scaricato una
  versione nuova; il controllo avviene anche quando l'app torna in primo piano.
- **Licenza MIT**, `package.json` 1.0.0, README per il portfolio (funzionalità, installazione, scelte con il
  perché, comandi).
- **Correzione dell'editor** (bug di F3): rinominando un giorno e cambiando subito il giorno della settimana il
  nome non torna più quello vecchio; l'E2E che falliva ogni tanto passa 40 volte su 40.
- Piano di sviluppo con la nuova **F9** (APK TWA); piano architetturale con distribuzione e promemoria.

## Decisioni prese (con il perché)
- **Niente `ng add @angular/pwa`**: la 21.2.26 era uscita da 8 giorni (regola: almeno 2 settimane) e lo schematic
  genera solo pochi file, scritti a mano. Dipendenza a runtime: `@angular/service-worker` 21.2.25.
- **Tutto in prefetch, ExcelJS compreso** (218 kB compressi): in palestra spesso non c'è rete e l'export deve
  funzionare offline anche la prima volta; costo una tantum all'installazione. Cambia l'indicazione
  "lazy" dell'handoff F8.
- **Registrazione quando l'app è stabile** (`registerWhenStable:30000`): il download della cache non rallenta la
  prima apertura.
- **L'utente sceglie quando aggiornare**: mai un ricaricamento automatico mentre digita un allenamento;
  `activateUpdate` + reload. Unica eccezione la cache non più servibile (`unrecoverable`), dove serve la rete.
- **Pulsante di installazione nelle Impostazioni** al posto della mini-barra del browser
  (`beforeinstallprompt` trattenuto): meno invadente, e la sezione spiega perché conviene.
- **Promemoria con tre condizioni** (qualcosa da salvare, una settimana dall'ultimo backup, una settimana da
  "Più tardi"): non disturba chi non ha dati nuovi. Le date stanno nelle impostazioni del dispositivo (campi non
  indicizzati, nessuna nuova versione Dexie) e sono lette con le sessioni in una sola live query, così il
  promemoria segue ogni salvataggio, export e ripristino.
- **`SettingsRepository.merge`**: un solo punto per "cambia una preferenza, tieni le altre, salva la lingua in
  uso se non c'era niente"; anche il recupero tra esercizi lo usa.
- **Icone senza font e senza dipendenze**: la "J" è un tracciato SVG, il rendering lo fa il Chromium di
  Playwright già installato; nelle maskable il segno occupa il 72%, dentro la zona sicura.
- **E2E della PWA sulla build vera**: build per Pages servita sotto `/j-training/` da un server Node di 60 righe
  (`scripts/serve-dist.mjs`) con lo stesso fallback del `404.html`; il test aspetta che la cache contenga tutti i
  file elencati in `ngsw.json`, poi va offline. Il deploy usa lo stesso `npm run build:pages`.
- **`updateDay` scrive solo i campi passati**: la pagina non riscrive più un valore letto prima di un'altra
  modifica (aggiornamento perso).

## File creati/modificati (percorsi)
- `ngsw-config.json`, `public/manifest.webmanifest`, `public/icons/**`, `src/index.html`, `angular.json`
- `src/app/app.{config,ts,html,spec.ts}`, `src/app/core/layout/update-banner/update-banner.ts`
- `src/app/core/services/pwa/{app-update,install-prompt}.service.ts` (+ spec), `src/app/core/app-version.ts`
- `src/app/features/settings/app-section/app-section.ts`, `src/app/features/settings/settings-page.{ts,html}`
- `src/app/core/services/backup/{backup-reminder,backup-status.service}.ts` (+ spec), `backup.service.ts`
- `src/app/core/repositories/{backup,settings,plan-editor}.repository.ts`, `src/app/core/models/{backup,settings}.model.ts`
- `src/app/features/workout/backup-reminder/**`, `src/app/features/settings/backup/**`, `src/app/shared/pipes/days-ago.pipe.ts`
- `src/app/features/plans/edit/plan-editor-page.ts`, `src/app/core/services/rest-timer/rest-settings.service.ts`
- `scripts/{generate-icons,serve-dist}.mjs`, `playwright.config.ts`, `e2e/{pwa,backup-reminder}.spec.ts`
- `.github/workflows/deploy.yml`, `package.json` (1.0.0, MIT, `build:pages`, `@angular/service-worker`), `LICENSE`, `README.md`
- `public/i18n/{it,en}.json`, `docs/piano-sviluppo.md`, `docs/piano-architettura.md`

## Stato test (unit / e2e / manuale)
- Unit: 313/313 (regola del promemoria, stato del backup su fake-indexeddb, "giorni fa" in italiano e inglese,
  aggiornamenti con `SwUpdate` finto, installazione con eventi finti per Android e iPhone, versione uguale a
  `package.json`, campi del giorno aggiornati separatamente).
- E2E: 32/32. Progetto `pixel` (dev server): +1 promemoria lungo 30 giorni con `page.clock` (compare dopo 8
  giorni, "Più tardi", torna dopo una settimana, export, poi silenzio senza dati nuovi). Progetto `pwa` (build di
  produzione): manifest e icone; offline dopo il primo caricamento, con pagina lazy, traduzioni e link interno.
- Build di produzione: bundle iniziale 611 kB (budget 650).
- Manuale: telefono su GitHub Pages (installazione, offline, archiviazione "Protetta", dati spostati con il
  backup): ESITO_TELEFONO.

## Problemi aperti / debito tecnico
- **Server di sviluppo nella stessa cartella condividono la cache di Vite** (`.angular/cache`): dopo l'installazione
  di una dipendenza un server già avviato, anche quello degli E2E, può servire due copie di Angular. Riavviare i
  server dopo ogni `npm install`. In CI la cache è disattivata (`CI=true`).
- `npm audit`: 2 moderate da `uuid` dentro ExcelJS (vedi handoff F8).
- Wake lock e archiviazione permanente da verificare su HTTPS (GitHub Pages).
- Notifiche con l'app in background non previste.
- Ereditati: valori digitati e non spuntati solo in memoria; bottom nav su "Schede" nel form esercizio aperto
  dall'allenamento; altre `<select>` dentro `<label>`; CSV con doppio clic in Excel italiano.

## Prossima fase: obiettivo e primo passo
**F9 — APK Android (TWA)**: un APK costruito con Bubblewrap che apre `https://janlu89.github.io/j-training/` a
schermo intero (Trusted Web Activity), firmato con una chiave di Gianluca e pubblicato su GitHub Releases.
L'APK usa l'archiviazione di Chrome per lo stesso sito: i dati sono quelli dell'app installata.

Primo passo: sostituire ESITO_TELEFONO qui sopra con l'esito della prova su GitHub Pages; poi tre decisioni di
Gianluca: (1) creare il repository `janlu89.github.io`, perché `/.well-known/assetlinks.json` deve stare alla
radice del dominio e un sito di progetto non può servirlo; (2) l'id del pacchetto (es. `io.github.janlu89.jtraining`);
(3) la chiave di firma, creata e custodita da lui fuori dal repository, di cui va solo l'impronta SHA-256 in
`assetlinks.json`. Bubblewrap scarica da sé JDK e Android SDK; verificare che la versione abbia almeno 2 settimane.
