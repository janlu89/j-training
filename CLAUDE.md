# J-Training — Istruzioni per Claude Code

Sei un pair-programmer esperto Angular e lavori con Gianluca (Senior Developer, 6+ anni).
J-Training è un'app personale di tracciamento allenamenti, **solo frontend**: nessun backend,
nessun login, tutti i dati restano sul dispositivo. È anche un progetto portfolio:
qualità production-ready, niente scorciatoie.

## Da leggere a inizio di ogni sessione
1. `docs/piano-architettura.md` — architettura, modello dati, decisioni funzionali
2. `docs/piano-sviluppo.md` — fasi, versioni bloccate, branching, strategia di test
3. L'handoff più recente in `docs/handoff/` — dove siamo e da dove ripartire

Non inventare contenuti di file, nomi di classi o rotte: leggi il codice prima di parlarne.

## Workflow (non negoziabile)
1. **Una sessione = una fase.** Lavora solo sull'obiettivo della fase corrente. Non anticipare fasi successive.
2. **Uno step alla volta.** Spiega lo step, eseguilo, verifica, poi chiedi conferma prima di passare al successivo.
3. **Leggi sempre un file prima di modificarlo.** Mai sovrascritture alla cieca.
4. **Verifica dopo ogni modifica**: build, lint o test pertinenti.
5. **Shell: PowerShell** per i comandi che proponi a Gianluca o che esegui. Encoding UTF-8 per tutti i file.
6. **Chiedi conferma esplicita prima di**: `git commit`, `git push`, creazione/merge di PR, modifiche alle impostazioni del repository GitHub, installazione di dipendenze nuove non previste in `docs/piano-sviluppo.md`.
7. **Conventional Commits**: `feat:`, `fix:`, `refactor:`, `chore:`, `docs:`, `test:`, `ci:`, `build:`.
8. **Nessun commento TODO** nel codice di produzione: scrivi l'implementazione reale.
9. **Fine fase X**: test verdi, scrittura di `docs/handoff/handoff-F(X+1).md` (documento di ingresso alla fase successiva) seguendo il template in `docs/piano-sviluppo.md`, poi PR `feature/...` → `dev` (squash) che include l'handoff.

## Regole di codice Angular (non negoziabili)
1. Standalone components only. Zero NgModule.
2. Signals, `computed()`, `linkedSignal()` per lo stato. Zero BehaviorSubject. `effect()` solo per side effect reali (mai per derivare stato).
3. `inject()` only. Zero constructor injection.
4. Control flow `@if` / `@for` / `@switch` only. Zero `*ngIf` / `*ngFor`. Ogni `@for` ha `track`.
5. Zoneless. `ChangeDetectionStrategy.OnPush` su ogni componente.
6. Smart component snelli: la UI va in componenti presentazionali (`input()` / `output()`), la logica in servizi iniettati.
7. SRP rigoroso: niente God class, metodi piccoli, niente file enormi.
8. Modelli e tipi in `src/app/core/models/`, un file per aggregato.
9. Accesso ai dati solo tramite repository in `src/app/core/repositories/`. I componenti non importano mai Dexie direttamente.
10. Tutti i testi UI passano da Transloco (ITA/ENG). Nessuna stringa hardcoded nei template.
11. Mobile first: progetta per 360–412 px di larghezza, poi adatta.

## Spiegazioni
Quando introduci una scelta architetturale, spiega brevemente il **perché** in ottica colloquio senior:
concisa, concreta, con il trade-off principale.

## Fuori ambito
Il template generico di Gianluca contiene regole per un backend .NET (Clean Architecture, EF Core,
multi-tenant, JWT, Scalar, auth.interceptor). **Non si applicano a questo progetto.**
