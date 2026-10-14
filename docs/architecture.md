# J-Training — Architecture

Last updated: 2026-10-15

## Constraints
- Frontend only: no backend, no login. Data lives only on the device (IndexedDB), never in the cloud.
- Mobile first. Android is the main target; iPhone through the PWA, not mandatory.
- Moving between devices: full JSON export/import.
- Bilingual UI, Italian / English, switchable at runtime from the settings.

## Stack
| Area | Choice | Why |
|---|---|---|
| Framework | Angular 21.2.x, standalone, zoneless, signals | PrimeNG 21 requires @angular/core ^21 |
| UI | PrimeNG 21.1.x (MIT) + @primeuix/themes | PrimeNG 22 moved to a commercial license with a yearly key |
| i18n | @jsverse/transloco 8.x | Runtime language switch on a single bundle; @angular/localize needs one build per language |
| Storage | Dexie 4.4.x on IndexedDB + `navigator.storage.persist()` | Asynchronous, indexed, reactive queries with `liveQuery` → `toSignal` |
| CSV | PapaParse 5.x | Standard RFC 4180 parser |
| Excel | ExcelJS 4.4.x | SheetJS on npm has not been updated since 2022 |
| Charts | Chart.js through PrimeNG Chart | Lightweight, enough for the history |
| PWA | @angular/service-worker | Fully offline, installable |
| Timer | Web Worker + timestamp-based countdown; sound (first) and vibration | Main-thread timers are throttled in the background |
| Hosting | GitHub Pages + GitHub Actions | Free; requires a public repository |
| Routing on Pages | Path routing + `index.html` copied to `404.html` at deploy time | Clean URLs; Pages has no built-in SPA fallback |
| Distribution | Installable PWA: Chrome installs it on Android as a WebAPK, on iPhone "Add to Home Screen". A TWA APK was evaluated and not built | The WebAPK already is an app with protected data and automatic updates; a TWA APK would use the same data and only matter for the Play Store ($25 and 12 testers for 14 days); a native iOS app needs a Mac and the Apple Developer Program |

## Functional decisions
1. **One log entry per set**: kg and reps are stored separately for every set (pyramids are supported).
2. **Load prefill**: the last kg recorded for that exercise name; if there is none, the plan's `ultimo_kg`. Always editable by the user.
3. **Exercise statuses**: `attivo` (active), `da_testare` (to test), `sospeso` (paused), `rimosso` (removed). `rimosso` is a soft delete: the exercise disappears from the plan, its history stays.
4. **Plan status**: `active` / `archived`. Importing a new plan archives the previous one and activates the new one in a single transaction. Two active plans are impossible by construction.
5. **Training days**: ordered labels (Day 1, 2, 3...) created from the CSV `giorno` values in order of first appearance. The user can link each one to a weekday. The app proposes today's day: the one linked to the current weekday; if the other days have a weekday but today has none, it is a rest day and the next one is proposed; without weekdays, the next day in the rotation (after the last session, completed or skipped). The user can always choose another day.
6. **Timer**: rest between sets only. Default from `rec_sec`, editable. No session-duration timer for now.
7. **History**: per exact exercise name ("Leg press" and "Leg press leggera" are different). The load unit (`totale` / `per_braccio`) is always shown.
8. **Analytics**: load progression at equal reps; weekly reps per exercise.

## Input CSV format
Columns: `fase,giorno,ordine,esercizio,tipo,attrezzo,serie,rip,posizione,ultimo_kg,unita_carico,rec_sec,rir,stato,note`

The column names are Italian on purpose: they are the format of the plans Gianluca already writes.
- `fase` (phase): integer, identifies the iteration of the plan (it changes about every month).
- `giorno` (day): free text (e.g. `sabato`, `domenica`, `mercoledi`).
- `ultimo_kg` (last load): number with a dot as decimal separator, may be empty (exercises still to test).
- `unita_carico` (load unit): `totale` (total) | `per_braccio` (per arm).
- `stato` (status): `attivo` | `da_testare` in the current CSV.
- `note` and `posizione` (equipment position): free text, may contain commas only when quoted.

## Data model
```
Phase        { id, name, fase, status: active|archived, importedAt }
TrainingDay  { id, phaseId, ordine, csvGiorno, weekday? }   // "Day N" label translated at runtime
Exercise     { id, phaseId, dayId, ordine, esercizio, tipo, attrezzo, serie, rip,
               posizione, ultimo_kg, unita_carico, rec_sec, rir,
               stato: attivo|da_testare|sospeso|rimosso, note, isManual }
Session      { id, phaseId, dayId, startedAt, endedAt?, outcome?: completed|skipped }
SetLog       { id, sessionId, exerciseId, esercizio, fase, date, setNo,
               kg, rip, rir?, unita_carico, recSecUsed?, note? }
```
**Why**: the plan (`Exercise`) is separate from what was performed (`SetLog`), so discrepancies are data rather than overwrites. `esercizio` and `fase` are denormalised and indexed on `SetLog`, so the history by name works across phases without joins.

## Export
- CSV / XLSX of a phase: plan + every SetLog (printable, readable by an AI).
- Full, versioned JSON `{ schemaVersion, exportedAt, phases, days, exercises, sessions, setLogs }` for backups and device changes.
- Backup reminder: "Last backup" in the settings; a notice on the workout page only when workouts have been waiting for a backup for at least a week, which can be postponed by a week.

## Folder structure
```
src/app/
  core/
    db/            Dexie definition and schema versions
    models/        domain types
    repositories/  one repository per table, plus aggregate repositories
    services/      import, export, backup, timer, analytics, persistence, PWA
    i18n/          Transloco configuration
  features/        plans, workout, history, analytics, settings
  shared/          presentational components, pipes
public/i18n/       it.json, en.json
```
**Why**: `core` holds singletons and data access; `features` are lazy routes that depend only on `core` and `shared`, never on each other. An acyclic dependency graph and features testable in isolation.
