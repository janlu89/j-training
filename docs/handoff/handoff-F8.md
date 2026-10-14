# Handoff F8 — PWA and release

Date: 2026-10-14
Branch / last commit: `feature/f7-export` (PR → `dev`); `dev` contains F1–F6 (#5–#9); `master` = F0 release

## Done (F7 — Export and backup)
- **JSON backup** from Settings → Backup: file `j-training-backup-YYYY-MM-DD.json` with
  `{ schemaVersion: 1, exportedAt, phases, days, exercises, sessions, setLogs }`, every record with its id.
  Device preferences (language, rest between exercises) are not included.
- **Restore from file**: the file is read and validated as a whole; when valid, a confirmation dialog shows the backup
  date, plans, workouts and sets, and warns that it will replace all the data of the device. Once confirmed, the
  restore runs in **a single transaction** and the app restarts on `/settings?restored=1` with the message
  "Backup restored". An invalid file is refused with the reason, the location of the wrong value
  (e.g. `setLogs[3].kg`) and "The data on this device has not been changed".
- **Plan export** from the plan detail ("Export the plan" section): **Excel** ("Plan" and "Sets" sheets)
  and **CSV** (one table with the plan and every saved set), file `Name - phase N.xlsx|csv`.
- **Plans, from the phone test**: plans keep their place, newest first, when they are switched on or off; before, the
  active one jumped to the top and switching off the last one animated the other toggles too.
- "ESITO_TELEFONO" placeholders replaced in `handoff-F4.md` (not recorded) and `handoff-F7.md` (ok).

## Decisions (and why)
- **Hand-written validation, "parse, don't validate"** (`RecordReader` + one reader per table): every record is
  rebuilt from the known fields only, with their types and allowed values; the return types make the compiler check
  that no field is missing. No new dependency (zod is not in the plan). It stops at the first problem with the path
  of the value: a file written by the app has none.
- **Integrity before writing**: unique ids per table, the references the app guarantees
  (`days.phaseId`, `exercises.phaseId/dayId`, `sessions.phaseId`, `setLogs.sessionId`), a single active plan,
  a single workout in progress. `sessions.dayId` and `setLogs.exerciseId` **may** point to a deleted day
  (the history outlives the plan) and are not checked.
- **Versioning**: `BACKUP_SCHEMA_VERSION = 1`; a file from a newer version is refused ("update the app"), older files
  will be migrated in `parseBackup` when the version goes up.
- **`exportedAt` in ISO 8601** (readable when the file is opened), record timestamps in epoch ms as stored:
  the restore is identical to the original.
- **Atomic restore with the original ids** (`BackupRepository.replaceAll`): clears and refills the 5 tables in one
  transaction; an error halfway rolls everything back (tested). IndexedDB moves the key generator past the explicit
  ids, so new records continue after the highest restored one (tested).
- **App restart after the restore** (`AppRestartService`): in-memory state (sets typed in `WorkoutDrafts`, the timer)
  would refer to ids that now point to other records; reloading the app is simpler and safer than having every
  feature invalidate its own state, and it does not couple Settings to Workout.
- **Always confirm**, even on an empty device: one predictable rule for a destructive operation;
  `ConfirmDialog` as for the editor's deletions.
- **Two formats, two audiences**. Excel for people: translated headers and values (statuses, units, "Day 1 ·
  sabato"), real numbers and dates, frozen and filterable header, printing fitted to the page width with the header
  repeated, plan name and phase in the page header, "Page N of M". CSV for tools and AI: RFC 4180, stable column
  names from the import format (language independent), raw values (codes, dot as decimal separator, ISO dates),
  UTF-8 BOM and CRLF.
- **CSV as a single table**: one row per performed set next to the plan; an exercise never performed appears once
  without sets; sets of exercises deleted with their day close the table. A CSV is a table: Excel, pandas and an AI
  read it without special cases (the alternative with sections was discarded).
- **Export content**: saved and skipped workouts, never the draft in progress (as in History); removed exercises are
  not in the "Plan" sheet but their sets stay. `SetLog`'s `rir`, `recSecUsed` and `note` are never filled in by the
  app: not exported to CSV/XLSX (the JSON backup keeps them).
- **Dates in Excel**: ExcelJS writes dates in UTC; the local calendar day is passed as midnight UTC, so a workout just
  after midnight does not end up on the previous day.
- **ExcelJS loaded on demand** (`import()` in the service): a 947 kB lazy chunk (218 kB gzip) downloaded only on the
  Excel click; initial bundle 602 kB (budget 650), plan page 16 kB. `exceljs` in `allowedCommonJsDependencies`.
- **Download** with `<a download>` and a Blob URL revoked after 10 s (revoking it at once can cancel the download on
  some mobile browsers). A message with the name of the saved file, useful on the phone.
- **Domain constants in the models** (`EXERCISE_STATUSES`, `LOAD_UNITS`, `PHASE_STATUSES`, `SESSION_OUTCOMES`,
  `BACKUP_TABLES`): CSV parser, exercise form and backup use the same source.
- **No formula escaping in the CSV**: the data is the user's own and the file is meant for an AI, where a leading
  apostrophe would be noise; the XLSX writes text as text.
- **Plan order independent of the status** (`importedAt` descending, then id): with "active first" the card moved on
  tap and the one sliding under the finger took the hover state (sticky on the phone), hence the animation on all
  the toggles. The active plan is still recognisable by its orange border. Measured frame by frame in the browser
  before and after the fix.

## Files created/changed (paths)
- `src/app/core/models/{backup,plan-export}.model.ts`, constants in `{exercise,phase,session}.model.ts`
- `src/app/core/repositories/{backup,plan-export}.repository.ts`, `plan.repository.ts` (plan order)
- `src/app/core/services/backup/**` (parser, record reader, integrity, service)
- `src/app/core/services/plan-export/**` (rows, CSV, XLSX, service)
- `src/app/core/services/{file-download.service,app-restart.service,iso-date}.ts`
- `src/app/features/settings/backup/**`, `src/app/features/settings/settings-page.{ts,html}`
- `src/app/features/plans/detail/plan-export/**`, `src/app/features/plans/detail/plan-detail-page.{ts,html}`
- `src/app/shared/pipes/local-date.pipe.ts` (`formatLocalDate`), `src/app/core/testing/plan-records.ts`
- `src/app/core/services/plan-csv/plan-csv-parser.ts`, `src/app/features/plans/exercise/exercise-form*.ts`
- `public/i18n/{it,en}.json`, `angular.json`, `package.json` (exceljs ~4.4.0), `e2e/{backup,plan-export,plan-import}.spec.ts`

## Test status (unit / e2e / manual)
- Unit: 275/275 (stable plan order, also with equal dates). Backup: identical round trip on an empty database,
  replacement with the original ids, next ids, rollback of a failed restore, settings excluded and untouched, too
  large file not read, every kind of refusal with its path. Export: rows in plan and diary order, CSV read back with
  PapaParse, XLSX read back with ExcelJS (sheets, headers, translated values, local dates, printing, filters,
  English), safe file names.
- E2E: 29/29 (+4): backup exported and restored on **a second browser** (a new Playwright context) and exported again
  **identical to the original**; a non-backup file refused without touching the data; Excel downloaded and read back;
  CSV downloaded and checked row by row; plans keep their place when switched on or off.
  Pixel 7 screenshots: confirmation, error, export section.
- Manual: real phone (Gianluca, 2026-10-15): on the old 4200 server Settings was blank and the toggles broken because
  of the Vite cache (see below), not reproducible on a fresh server; after the restart the app works; from there the
  fix of the order in Plans. After the fix: plans stay in place, backup, restore and Excel/CSV export ok
  (Gianluca, 2026-10-15).

## Open issues / technical debt
- **Pre-existing editor bug (F3), flaky E2E**: renaming a day and changing its weekday right after, `updateDay` also
  writes back the previous name if the live query has not emitted again yet (lost update). "creates a plan from
  scratch and trains with it" fails about once in 90 runs; CI has 1 retry. Fix: update only the changed field.
- `npm audit`: 2 moderate from `uuid` < 11 inside ExcelJS (it concerns v3/v5/v6 with `buf`; ExcelJS only uses v4 and
  the browser bundle has its own copy). No fix without going back to ExcelJS 3.
- Development servers in the same folder share `.angular/cache`: after a dependency change, a server already running
  serves chunks from two different optimisations, i.e. two copies of Angular (`getBaseHref` of null,
  `NG01203: No value accessor`). Restart it.
- CSV opened with a double click in Italian Excel: the separator is a comma and everything ends up in one column;
  for Excel there is the XLSX (or Data → From Text/CSV).
- File picker on Android with `accept=".json,application/json"`: to be checked on the phone.
- Inherited from F7: wake lock only on HTTPS; background notifications (F8); typed but unticked values only in
  memory; bottom nav on "Plans" in the exercise form opened from the workout; other `<select>` inside `<label>`;
  **MIT license** and **release to `master`** of F1–F7 still to do.

## Next phase: goal and first step
**F8 — PWA and release**: service worker, manifest, icons, install prompt, Android test, v1.0.0
(app installed on the phone and working offline).

First step: branch `feature/f8-pwa` from an updated `dev` (after the F7 PR is merged); `ng add @angular/pwa`, then
`ngsw-config.json` with the ExcelJS chunk (947 kB) loaded lazily, so the export works offline without making the
first install heavier.
