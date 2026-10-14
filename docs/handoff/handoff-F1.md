# Handoff F1 — Core

Data: 2026-10-14
Branch / ultimo commit: `master` @ `b76efd2` (release F0, PR #2) · `dev` @ `ecf72ed` (PR #1) + PR handoff F0

## Fatto
- Ambiente verificato: Git 2.55, GitHub CLI 2.102 (login `janlu89`), Node 24.14, npm 11.9, Angular CLI 21.2.
- Scaffold Angular 21.2 nella cartella esistente: standalone, zoneless (default in v21, nessun `zone.js`),
  SCSS, routing, Vitest, niente SSR, nessun file di configurazione AI.
- Qualità: angular-eslint 21 con regole che applicano le convenzioni del progetto (OnPush, signals, control flow,
  self-closing tags; standalone e `inject()` già nel set raccomandato), Prettier, `.editorconfig`, LF ovunque.
- Componente root `OnPush`, pagina demo rimossa: solo titolo "J-Training" + `<router-outlet />`.
- Repository pubblico https://github.com/janlu89/j-training configurato da `scripts/setup-github.ps1`:
  `dev` di default, squash + merge commit (rebase off), branch cancellati dopo il merge,
  ruleset `protect-master` (solo merge commit) e `protect-dev` (solo squash) con PR obbligatoria,
  0 approvazioni, no force push/cancellazione, status check `ci` obbligatorio.
- CI (`ci.yml`) su PR verso `dev`/`master`: `npm ci`, lint, format:check, test:ci, build:prod.
- Deploy (`deploy.yml`) su push su `master`: build con `--base-href /j-training/`, `404.html`,
  pubblicazione su https://janlu89.github.io/j-training/. Ambiente `github-pages` limitato a `master`.

## Decisioni prese (con il perché)
- **Convenzioni del progetto nel lint**: una convenzione scritta solo nei documenti si erode, una regola di lint
  la fa rispettare la CI su ogni PR. Costo: qualche falso positivo da gestire caso per caso.
- **angular-eslint 21, non 22**: la 22 è allineata ad Angular 22; il progetto resta su Angular 21 per PrimeNG 21.
- **LF imposto da `.gitattributes`, `.editorconfig` e Prettier**: stessi file su Windows e sulla CI Linux,
  nessun diff fantasma.
- **`docs/` esclusa da Prettier**: documenti scritti a mano, la formattazione resta all'autore.
- **Metodo di merge imposto dal ruleset** (`allowed_merge_methods`), non solo dalle impostazioni del repo:
  la strategia di branching non dipende dal pulsante scelto. Squash con titolo e corpo della PR:
  il titolo Conventional Commit della PR diventa il commit su `dev`.
- **Script `gh` idempotente e versionato**: la configurazione del repository è codice, riproducibile e rieseguibile
  (es. `-RequiredStatusChecks 'ci'` dopo il primo run verde).
- **Ambiente `github-pages` solo da `master`**: abilitando Pages, GitHub autorizza il branch di default (`dev`);
  rimosso per privilegio minimo sull'ambiente di produzione.
- **`.nvmrc`** come unica fonte della versione di Node, per sviluppo locale e CI.
- **Nome app come costante nel componente root**: è un nome proprio, non un testo da tradurre.
  Tutti gli altri testi UI passano da Transloco a partire da F1.
- **Nessuna attribuzione AI nei commit e nelle PR**: Gianluca dev'essere l'unico contributor del repository.
  La storia iniziale è stata riscritta (force push con ruleset sospesi temporaneamente) per rimuovere i trailer.

## File creati/modificati (percorsi)
- `angular.json`, `package.json`, `package-lock.json`, `tsconfig*.json`, `eslint.config.js`
- `.prettierrc`, `.prettierignore`, `.editorconfig`, `.gitattributes`, `.gitignore`, `.nvmrc`
- `src/index.html`, `src/styles.scss`, `src/main.ts`
- `src/app/app.ts`, `app.html`, `app.scss`, `app.spec.ts`, `app.config.ts`, `app.routes.ts`
- `scripts/setup-github.ps1`
- `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`
- `README.md`, `docs/handoff/handoff-F1.md`
- `.vscode/` (generato dalla CLI, incluso `mcp.json` per il server MCP della CLI Angular)

## Stato test (unit / e2e / manuale)
- Unit: 3/3 verdi (`npm run test:ci`), in CI sulla PR #1 e #2.
- E2E: non previsti in F0 (Playwright da F2).
- Manuale:
  - Locale PC: `ng serve` ok, anche in rete locale (`--host 0.0.0.0`, http://192.168.1.231:4200, IP DHCP).
  - Pages: https://janlu89.github.io/j-training/ ok (desktop e viewport mobile 375 px);
    link profondo servito da `404.html`, l'app si avvia.
  - Telefono reale su Pages: ok (verificato da Gianluca il 2026-10-14).

## Problemi aperti / debito tecnico
- **Nessuna rotta wildcard**: un URL sconosciuto (es. `/j-training/qualcosa`) avvia l'app ma il router registra
  `NG04002` in console. Da risolvere in F1 con le prime rotte e un `**` di fallback.
- **Licenza assente**: il repository è pubblico ma "tutti i diritti riservati". Decisione presa: aggiungere MIT.
- **Squash commit della PR #1** contiene ancora un trailer `Co-authored-by` di Gianluca stesso (innocuo).
- Merge delle PR e force push li esegue sempre Gianluca.
- Push diretti su `master`/`dev` impossibili per costruzione: anche le correzioni allo script passano da PR.

## Prossima fase: obiettivo e primo passo
**F1 — Core**: modelli del dominio, Dexie con schema versionato, repository per tabella,
`navigator.storage.persist()`, i18n ITA/ENG con Transloco (cambio lingua a runtime),
shell mobile (bottom nav, tema PrimeNG), pagina impostazioni.

**Indicazioni di Gianluca per il tema (shell e PrimeNG)**:
- colore primario scuro, arancione come secondario/accento, bianco per superfici e spazi;
- priorità alla leggibilità: contrasto testo/sfondo almeno WCAG AA (4.5:1 per il testo normale),
  l'arancione non va usato per testo lungo su bianco;
- definire i colori come design token del preset PrimeNG (`@primeuix/themes`), non come valori sparsi negli SCSS;
- proporre la palette a Gianluca prima di applicarla.

Primo passo: branch `feature/f1-core` da `dev`; verificare le versioni correnti di PrimeNG 21.1.x,
@primeuix/themes, @jsverse/transloco 8.x, dexie 4.4.x, fake-indexeddb e installarle (sono previste dal piano).
