# Handoff F3 — Plan editor

Date: 2026-10-14
Branch / last commit: `feature/f2-plans` (PR #6 → `dev`); `dev` contains F1 (PR #5); `master` = F0 release

## Done (F2)
- **Plans archive**: every imported plan stays, with a name (`Phase.name`); only one is active, by construction.
  From the list and the detail: **Make active** / **Archive**, status always visible (Active / Archived).
- **CSV import** (`/plans/import`): pure parser on PapaParse (`,` `;` tab, decimal comma, BOM, CRLF), per-cell
  validation with the spreadsheet row number, mixed phases rejected, files > 1 MB rejected; preview with days and
  counts, editable name, "phase already imported" warning, "use it as the active plan" option; **Download an example
  plan** link (`public/examples/scheda-esempio.csv`).
- **Single transaction** (`PlanRepository.savePlan`): archives the active plan + creates phase, days, exercises;
  an error rolls everything back.
- **Workout** (`/workout`): shows **only the day proposed for today** (`suggestDay`): the day linked to the current
  weekday → "Today's workout"; weekdays set but not today → "Rest today" + the next one planned; no weekdays →
  rotation after the last session (ready for F4). A D1/D2/… picker to choose another day.
- **Plan detail** (`/plans/:id`): every day collapsible, weekday editable.
- **Navigation**: Workout · Plans · History · Analytics; settings from the gear in the header.
- **E2E** with Playwright 1.63 (Pixel 7 profile, it-IT locale, fixed clock), also in CI.

## Decisions (and why)
- **Phases revised with Gianluca** (`docs/development-plan.md`): F3 becomes the "Plan editor" (without CSV too);
  F4 includes save/skip day and a quick edit of the equipment position; F5 a timer per exercise.
- **"Day N" label not stored**: derived from `ordine` through i18n (`TrainingDay.label` removed).
- **Aggregate `PlanRepository`** next to the per-table repositories: it owns multi-table reads and the transactions
  of the "only one active plan" invariant.
- **Pure `suggestDay` + `CLOCK` injection token**: the "today" logic is testable without real dates; `linkedSignal`
  for the selected day (it follows the suggestion until the user chooses).
- **PapaParse** listed in `allowedCommonJsDependencies` (UMD only); it is in the lazy chunk of the import page.
- **Playwright 1.63.0**, not 1.64.x: newer versions were published less than two weeks earlier.
- **Accessibility**: font icons (`pButtonIcon`, CSS glyphs) ended up in the accessible name → `aria-hidden`
  everywhere; `<select>` with `[selected]` on the options (the `[value]` on the select arrives before the options).
- **Button links**: the global link style excludes `.p-button`.

## Files created/changed (paths)
- `src/app/core/models/{phase,training-day,plan,plan-import}.model.ts`
- `src/app/core/repositories/plan.repository.ts`
- `src/app/core/services/{plan-import.service,workout-plan.service,day-suggestion,clock}.ts`, `plan-csv/*`
- `src/app/features/workout/**`, `src/app/features/plans/**`
- `src/app/shared/ui/{plan-days,exercise-item}/**`, `src/app/shared/pipes/*`, `src/styles/_page.scss`
- `e2e/**`, `playwright.config.ts`, `.github/workflows/ci.yml`, `public/examples/scheda-esempio.csv`
- `docs/development-plan.md`, `docs/architecture.md`

## Test status (unit / e2e / manual)
- Unit: 81/81 (parser, transactions and rollback, activate/archive, day suggestion, services, shell).
- E2E: 8/8 (import, only today's day, choosing another day, rest day, archive activate/archive,
  downloadable example, file errors, persistent weekday).
- Manual: built-in browser at 375 px ok. Real phone: ok (Gianluca, 2026-10-14). Request: the day picker should become
  a list of labels with a ▶ button to a dedicated day page → planned in F4.

## Open issues / technical debt
- **MIT license** to be added.
- **Release to `master`** of F1+F2 still to do (merges batched).
- **APK with Capacitor** (app-private storage) + automatic backup to file: decision for F7/F8.
- **Deleting a plan** not available yet: it comes with the editor (F3).

## Next phase: goal and first step
**F3 — Plan editor**, for those without a CSV and to fix imported plans:
- **Plan**: create from scratch (name, phase, days), rename, delete (with confirmation; if it has recorded sessions,
  offer to archive it instead of deleting it, so the history is not lost).
- **Days**: add, rename the original day (`csvGiorno`), reorder, delete (with its exercises), weekday.
- **Exercises**: add, edit every field (name, type, equipment, sets, reps, **equipment position**, last kg, load
  unit, **rest**, RIR, status, notes), reorder, move to another day, delete.
  Delete = status `rimosso` (soft delete, history intact); the 4 statuses can be chosen.
- **Default rest by type** (a promise to Gianluca's friends): when the type is chosen in the form and the rest was not
  touched, **compound 150 s** and **isolation 75 s** are proposed; always editable.
- `isManual: true` for exercises created in the editor.
- Forms with validation and translated messages; mobile first (full-width forms, numeric keyboard for numbers).

First step: branch `feature/f3-editor` from an updated `dev` (after PR #6 is merged); define in `PlanRepository`
the write operations (empty createPlan, rename, delete with a sessions check, add/update/reorder/delete of days and
exercises) with tests on fake-indexeddb, then the `/plans/new` and `/plans/:id/edit` pages.
