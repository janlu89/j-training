# Handoff F7 — Export and backup

Date: 2026-10-14
Branch / last commit: `feature/f5-rest-timer` (PR → `dev`, holding **F5 and F6** together, at Gianluca's request);
`dev` contains F1 (#5), F2 (#6), F3 (#7), F4 (#8); `master` = F0 release

## Done (F5 — F4 fixes and rest timer; F6 — History and analytics)
- **Save the day even without ticks**: the summary offers "Also save the unticked sets (N)", selected by default when
  no set is ticked; sets, closing and loads in the plan in a single transaction (`saveDay`).
- **Remove set** next to "Add set", even below the planned number; the last ticked set is removed together with its
  record.
- **Quieter UI**: small slate-grey icons (▶, ✓, pencil, empty state), a light "Workout in progress" card;
  touch area ≥ 44 px unchanged.
- **Plans**: "Active" toggle (`ToggleSwitch`) instead of "Make active" / "Archive", in the list and in the detail.
- **Rest timer**, always **started by hand** (no automatic start when a set is ticked, as Gianluca asked):
  between sets from the exercise's "⏱ N s" chip (the plan's rest), between exercises from the "⏱ Rest 2:00" button
  **between one exercise card and the next** ("Next exercise · Curl"), **2 minutes by default**, editable in the
  settings (1:00–3:00). A bar above the bottom nav, visible on every page, −15 / +15 / stop.
  Two intermediate versions (rows between sets, automatic start at the last set) were removed: they were not what
  Gianluca meant.
- **End-of-rest sound**: **one beep per second in the last 5 seconds** (880 Hz), a long, higher **"go"** at zero
  (1.32 kHz), then a double beep every 1.5 s with vibration; **it stops by itself 15 seconds after zero** (and the
  rest closes) or with "Stop alarm"; adding time during the countdown stops it.
- **History** (`/history`): saved and skipped workouts by date (never drafts), detail with the sets of every exercise
  in plan order (`/history/session/:id`), Exercises view and history by exact name across different plans with the
  phase number (`/history/exercise/:name`); load unit always visible.
- **Analytics** (`/analytics`): exercise and reps filters on one row; "Last" and "Best" tiles at equal reps; line
  chart of the load at equal reps; columns of reps per week (last 12, empty weeks included); every chart has a table
  with the same data.

## Decisions (and why)
- **Diagnosis of the F4 test**: "it does not save" meant the History stayed empty (it was the F6 placeholder), not a
  save error. The fix for saving without ticks stays valid: it was a deviation from the spec.
- **F4 PR merged from the GitHub console** (squash, CI green); F5 rebased on `dev`.
- **Timer on timestamps + Web Worker**: the remaining time is always `end − now`; the worker wakes the page up
  regularly when the main thread is throttled in the background. `tsconfig.worker.json` + `webWorkerTsConfig`.
- **Root service + bar in the shell**: the rest survives navigation. Native buttons in the bar: with PrimeNG's
  `ButtonDirective` the initial bundle went from 599 to 679 kB (budget 650).
- **Audio unlocked by the tap that starts the rest** (`RestAlarm.prepare`): mobile browsers allow audio only after a
  user gesture. No audio files: generated sounds, **all scheduled at once on the audio clock** at the start of the
  countdown, so they are on time even when the page's timers are throttled.
- **Wake lock** taken again when back in the foreground and released when the rest closes (by hand or by itself).
- **Rest between exercises as a device preference** (`AppSettings.exerciseRestSeconds`, not indexed: no new Dexie
  version), read with a `resource` by `RestSettingsService`.
- **Set rows as a difference from the plan** (signed `setDelta`): changes to the plan during the workout stay
  consistent.
- **`HistoryRepository`** as a separate read side (SRP); drafts are excluded in one place (`finishedLogs`).
- **Charts**: Chart.js 4.5 through PrimeNG Chart, loaded only with the Analytics page (224 kB, 66 kB gzip).
  A single series in orange 600 (contrast checked against white), no legend, flush grid, no fill under the line
  (the axis does not start at zero and an area would exaggerate), a table for every chart.
- **Contrast**: toggle track off slate 500 (4.8:1), on orange 600 (3.6:1).
- **Labels with `for`/`id`** in the Analytics filters: a `<select>` inside a `<label>` adds its value to the name.

## Files created/changed (paths)
- `src/app/core/services/rest-timer/**` (service, worker, ticker, alarm, wake lock), `src/app/core/layout/rest-timer-bar/**`
- `src/app/core/repositories/{workout-session,history}.repository.ts`, `src/app/core/services/analytics/**`
- `src/app/core/models/{rest-timer,history,workout}.model.ts`
- `src/app/features/workout/day/**` (store, rows, exercise log, summary), `src/app/features/plans/active-switch/**`
- `src/app/core/services/rest-timer/rest-settings.service.ts`, `src/app/features/settings/**`, `src/app/core/models/settings.model.ts`
- `src/app/features/history/**`, `src/app/features/analytics/**`, `src/app/shared/pipes/local-date.pipe.ts`
- `src/app/app.{ts,html,scss}`, `src/styles.scss`, `src/app/core/theme/j-training.preset.ts`
- `angular.json`, `tsconfig*.json`, `package.json` (chart.js), `public/i18n/*.json`
- `e2e/{workout,history,plan-import}.spec.ts`

## Test status (unit / e2e / manual)
- Unit: 211/211 (atomic save with unticked sets; timer with fake clock and ticker: countdown, beeps from −5 s,
  closing by itself 15 s after zero, +15 stopping it, back from the background; scheduled sounds and vibration;
  wake lock; rest between exercises by hand and as a setting; history; analytics).
- E2E: 25/25 (save at the end of the workout and remove set; no automatic rest on tick; rest by hand
  and "Stop alarm"; countdown and closing by itself 15 s after zero; button between exercises at 2:00 and at 1:30
  from the settings; plans toggle; history and analytics with four weeks of data entered through the app).
- Manual: built-in browser at 390 px ok; chart screenshots from the E2E (Pixel 7). Real phone: ok (Gianluca, 2026-10-14).

## Open issues / technical debt
- **Wake lock only in a secure context**: not available on `http://192.168.1.231:4200`; to be checked on GitHub
  Pages (HTTPS) or with USB port forwarding on `localhost`.
- **Notifications with the app in the background**: not planned; they need the service worker (F8).
- Typed but unticked values live in memory (they do not survive a forced close of the app).
- Opening the exercise form from the workout highlights "Plans" in the bottom nav.
- Other `<select>` elements inside a `<label>` (plan detail, editor, exercise form): switch to `for`/`id` as in Analytics.
- **MIT license** to be added. **Release to `master`** of F1–F6 still to do.

## Next phase: goal and first step
**F7 — Export and backup**: export of a phase to CSV and XLSX (plan + every `SetLog`, printable and readable by an
AI) with ExcelJS 4.4; full, versioned JSON backup `{ schemaVersion, exportedAt, phases, days, exercises,
sessions, setLogs }`; restore on another browser identical to the original (single transaction, confirmation before
overwriting).

First step: branch `feature/f7-export` from an updated `dev` (after the F5+F6 PR is merged); `BackupService`
(JSON export/import with schema validation) with tests on fake-indexeddb, then the Backup section in the settings.
