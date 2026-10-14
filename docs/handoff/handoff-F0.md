# Handoff F0 — Avvio progetto

Data: 2026-10-14
Branch / ultimo commit: nessuno (repository non ancora creato)

## Stato attuale
- La cartella `A:\Personal dev projects\j-training` contiene solo `CLAUDE.md` e `docs/`.
- Architettura e piano di sviluppo sono definiti (vedi `docs/`).
- Decisioni già prese: nome app J-Training, repository `j-training`, gestione GitHub con `gh`,
  squash per feature → dev, merge commit per dev → master.

## Ambiente di Gianluca (verificato il 2026-10-14)
- Windows, PowerShell
- Node v24.14.0, npm 11.9.0
- Git 2.33.1: da aggiornare
- GitHub CLI: da installare
- Angular CLI 21: da installare globalmente

## Obiettivo della fase F0
Arrivare a un'app Angular vuota, di qualità, pubblicata su GitHub Pages, con repository protetto e CI funzionante.

## Step (uno alla volta, conferma tra uno e l'altro)

### 1. Verifica dell'ambiente
- Controllare `git --version`, `gh --version`, `gh auth status`, `node -v`, `ng version`.
- Se manca qualcosa, proporre a Gianluca i comandi: `winget upgrade --id Git.Git -e`,
  `winget install --id GitHub.cli -e`, `npm install -g @angular/cli@21`.
- `gh auth login` lo esegue Gianluca personalmente.

### 2. Scaffold Angular nella cartella esistente
- Verificare prima le opzioni disponibili con `ng new --help` (CLI 21).
- Generare il progetto **in questa cartella** (`--directory .`), nome `j-training`: SCSS, routing, niente SSR, zoneless, senza inizializzare git (lo si fa al passo 4).
- **Non generare file di configurazione AI** (opzione `--ai-config` o prompt equivalente):
  sovrascriverebbe questo `CLAUDE.md`.
- Verificare che `CLAUDE.md` e `docs/` siano intatti dopo lo scaffold.
- Verificare `ng serve` e `ng test`.

### 3. Qualità del codice
- angular-eslint (`ng add @angular-eslint/schematics`), Prettier con `.prettierrc` e `.editorconfig` coerenti.
- Script npm: `lint`, `format`, `format:check`, `test:ci` (senza watch), `build:prod`.
- `ChangeDetectionStrategy.OnPush` sul componente root; pulizia della pagina demo generata dalla CLI.
- README.md con: descrizione, stack, comandi, link a `docs/`.

### 4. Git e GitHub
- `git init` con branch iniziale `master`, `.gitignore` corretto, primo commit `chore: scaffold Angular 21 project`.
- Script versionato `scripts/setup-github.ps1` che, tramite `gh`:
  - crea il repository pubblico `j-training` e fa il push di `master`;
  - crea `dev` da `master` e lo imposta come branch di default;
  - consente solo squash merge e merge commit (rebase disattivato) e cancella i branch dopo il merge;
  - crea un ruleset per `master` e uno per `dev`: PR obbligatoria, 0 approvazioni, blocco di force push e cancellazione;
  - abilita GitHub Pages con sorgente "GitHub Actions".
- Mostrare lo script a Gianluca e ottenere conferma prima di eseguirlo.

### 5. CI e deploy (branch `feature/f0-ci`)
- `.github/workflows/ci.yml`: su PR verso `dev` e `master` → `npm ci`, lint, format:check, test:ci, build.
- `.github/workflows/deploy.yml`: su push su `master` → build di produzione con `--base-href /j-training/`,
  copia di `index.html` in `404.html`, `actions/upload-pages-artifact` e `actions/deploy-pages`.
- Usare le versioni correnti delle action ufficiali (verificarle, non andare a memoria).
- Dopo il primo run verde, aggiungere il controllo CI come status check obbligatorio nei ruleset.

### 6. Prima release
- PR `feature/f0-ci` → `dev` (squash), poi PR `dev` → `master` (merge commit).
- Verificare il deploy all'URL di Pages da desktop e da telefono.

### 7. Chiusura
- Scrivere `docs/handoff/handoff-F1.md` secondo il template in `docs/piano-sviluppo.md`
  e includerlo nell'ultima PR della fase.

## Prossima fase
F1 — Core: modelli, Dexie, repository, i18n ITA/ENG, shell mobile, impostazioni.
