# J-Training

A personal gym workout tracker designed for the smartphone and installable as an app (PWA). Import a plan
from CSV or build it by hand, log kg and reps for every set, time your rests and follow the history and progression
of each exercise.

**Frontend only**: no backend and no login. All data stays on the device (IndexedDB) and moves between devices
with a backup file.

**App**: <https://janlu89.github.io/j-training/> (Italian and English, switchable in the settings)

## Features

- **Plans**: CSV import with preview and validation, full editor (days, exercises, rests, statuses), archive with a
  single active plan.
- **Workout**: the day is proposed from the weekday or the rotation, every set is logged with prefilled loads, the
  draft is saved at every set, the day can be saved or skipped.
- **Rest timer** based on timestamps and a Web Worker, with sounds in the last seconds, vibration and the screen
  kept on.
- **History and analytics**: workouts by date, history per exercise, load progression at equal reps and weekly
  reps, every chart with its data table.
- **Export and backup**: plan and sets to Excel (to print) or CSV (for an AI); full, versioned JSON backup and a
  restore validated and applied in a single transaction; a weekly reminder when workouts have not been backed up.
- **PWA**: installable, works offline, tells when a new version is available.

## Install on your phone

- **Android (Chrome)**: open the app, then Settings → App → "Install the app" (or Chrome's menu → "Install app").
  Chrome installs it as a real app with its own icon and protects its data from the browser's automatic cleanup.
- **iPhone (Safari)**: Share → "Add to Home Screen".

To move your data to another device: Settings → Backup → "Export backup", then "Restore from file" on the new
device.

## Architecture choices

| Choice                                           | Why                                                                                         |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| Standalone, zoneless, signals, OnPush            | Explicit, predictable change detection, no NgModules                                        |
| Dexie only inside repositories (ESLint rule)     | Components know nothing about storage; reactive queries with `liveQuery` → `toSignal`       |
| Plan (`Exercise`) separate from sets (`SetLog`)  | Discrepancies are data, not overwrites; history by exercise name across different plans    |
| A transaction for every multi-table write        | Invariants by construction: a single active plan, a single workout in progress              |
| "Parse, don't validate" for the backup           | A restore can never produce a state the app could not have created                          |
| ExcelJS loaded on demand                         | ~1 MB downloaded only on the first export; initial bundle under 650 kB                      |
| Angular service worker with full prefetch        | Everything available offline, export included, in a gym without signal                      |
| PWA instead of a native app                      | One codebase, automatic updates, no store costs; persistent storage and backups             |

The domain fields keep the Italian names of the CSV format (`esercizio`, `serie`, `rip`, ...), so a plan file maps
one to one onto the data model. Details in the [architecture](docs/architecture.md) and the
[handoffs](docs/handoff/).

## Stack

| Area      | Technology                                                    |
| --------- | ------------------------------------------------------------- |
| Framework | Angular 21 (standalone, zoneless, signals), service worker    |
| UI        | PrimeNG 21, Chart.js                                          |
| i18n      | Transloco (Italian / English, runtime language switch)        |
| Storage   | Dexie on IndexedDB                                            |
| Files     | PapaParse (CSV), ExcelJS (XLSX)                               |
| Tests     | Vitest + fake-indexeddb, Playwright (Pixel 7, offline too)    |
| Quality   | angular-eslint, Prettier, CI on every PR                      |
| Hosting   | GitHub Pages through GitHub Actions, deployed on every release |

## Requirements

- Node.js 24.x
- npm 11.x

## Commands

| Command                           | Description                                                    |
| --------------------------------- | -------------------------------------------------------------- |
| `npm ci`                          | Install the dependencies from the lockfile                     |
| `npm start`                       | Start the development server on `http://localhost:4200`        |
| `npm test`                        | Run the unit tests in watch mode                               |
| `npm run test:ci`                 | Run the unit tests once (CI)                                   |
| `npm run e2e`                     | End-to-end tests: development server and production PWA build |
| `npm run lint`                    | Static analysis with angular-eslint                            |
| `npm run format`                  | Format the code with Prettier                                  |
| `npm run format:check`            | Check the formatting without changing files                    |
| `npm run build:prod`              | Production build in `dist/`                                    |
| `npm run build:pages`             | Production build for GitHub Pages (`/j-training/`)             |
| `node scripts/generate-icons.mjs` | Regenerate the app icons from a single drawing                 |

## Documentation

- [Architecture](docs/architecture.md): constraints, stack, data model, functional decisions
- [Development plan](docs/development-plan.md): phases, versions, branching, test strategy
- [Handoffs](docs/handoff/): state of the project at the start of every phase

## Branching

- `master`: production, deployed automatically to GitHub Pages
- `dev`: integration, default branch
- `feature/*`: squash-merged into `dev`; releases `dev` → `master` with a merge commit

## License

[MIT](LICENSE) © 2026 Gianluca Meola
