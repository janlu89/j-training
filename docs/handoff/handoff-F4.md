# Handoff F4 — Workout

Date: 2026-10-14
Branch / last commit: `feature/f3-plan-editor` (PR → `dev`); `dev` contains F1 (#5) and F2 (#6); `master` = F0 release

## Done (F3 — Plan editor)
- **Create a plan from scratch** (`/plans/new`): name, phase (proposed = highest + 1), "use it as active"; then the editor.
- **Editor** (`/plans/:id/edit`): name and phase; days add / rename (Enter or leaving the field saves) /
  weekday / ▲▼ / delete with confirmation; exercises ▲▼ and a link to the form; delete the plan with confirmation,
  refused when sessions are recorded (message: archive it).
- **Exercise form** (`/plans/:id/days/:dayId/exercises/new`, `/plans/:id/exercises/:exerciseId`): every field
  (name, type and equipment with suggestions, **equipment position**, sets, reps, load, unit, **rest**,
  RIR, status, day to move it, notes), translated validation, numeric keyboards, delete = `rimosso`.
- **Default rest by type** (`defaultRestFor`): compound 150 s, isolation 75 s, until the user sets the rest;
  quick buttons 60/90/120/150/180 s.
- Entry points: "Create plan" in Plans and on the empty Workout page; "Edit" on every plan and in the detail.

## Decisions (and why)
- **`PlanEditorRepository` separate** from `PlanRepository` (reads/import/activation): SRP, no God class.
- **Reorder = move and renumber 1..n** (`reorder`, a pure function): correct even with CSV rows sharing an `ordine`.
- **Delete day = hard delete** of the day and its exercises: the history (`SetLog`) has the exercise name and phase
  denormalised. **Delete exercise = soft delete** (`rimosso`), as in the plan.
- **Deleting a plan refused when sessions exist**: the history is never lost by mistake; the plan is archived instead.
- **Typed Reactive Forms** for the forms (stable); signals for the page state; `effect` only to sync the form with
  the loaded data while the user is not editing (a real side effect).
- **ESLint `no-unused-vars` with `ignoreRestSiblings`**: `const { id, ...rest } = x` is the idiomatic way to drop fields.
- **Danger buttons**: red 700 instead of Aura's 500 (white on red 500 = 3.8:1, on red 700 = 6.5:1).
- **PrimeNG ConfirmDialog** for deletions (no dependency on `@angular/animations`).

## Files created/changed (paths)
- `src/app/core/models/plan-editor.model.ts`, `src/app/core/repositories/plan-editor.repository.ts`
- `src/app/core/services/exercise-defaults.ts`
- `src/app/features/plans/{new,edit,exercise}/**`, `plans-page.*`, `plan-card/*`, `detail/*`, `workout/workout-page.html`
- `src/styles/_form.scss`, `src/app/core/theme/j-training.preset.ts`, `eslint.config.js`, `public/i18n/*.json`
- `e2e/plan-editor.spec.ts`, `src/app/core/testing/fixtures.ts`

## Test status (unit / e2e / manual)
- Unit: 94/94 (editor: create/rename/delete a plan with and without sessions, days, reorder with duplicate `ordine`,
  move an exercise between days, soft delete; default rest).
- E2E: 12/12 (8 import/archive + 4 editor: plan from scratch used in Workout, every exercise field,
  reorder/move/delete, plan deletion).
- Manual: DOM checked at 375 px (no overflow). Real phone: not recorded.

## Open issues / technical debt
- **MIT license** to be added. **Release to `master`** of F1–F3 still to do.
- **APK with Capacitor** + automatic backup to file (F7/F8).
- `<select>` elements inside a `<label>` get label + selected value as their accessible name (standard behaviour):
  consider explicit `for`/`id` for a cleaner name in screen readers.

## Next phase: goal and first step
**F4 — Workout**:
- **Workout** becomes the list of the active plan's days as **labels with a ▶ button** (Gianluca's request);
  the day proposed for today (`suggestDay`) is highlighted. ▶ opens the **dedicated day page** (`/workout/day/:dayId`).
- **Day page**: starts the session; for every exercise, set rows with **kg and reps** prefilled
  (last kg recorded for that name, otherwise the plan's `ultimoKg`); discrepancies from the plan saved;
  **quick edit of the equipment position**; **Save day** (session `completed`) and **Skip day** (`skipped`):
  both move the rotation on.
- **Two ways of logging, both supported**: set by set during the workout, or everything at the end
  (e.g. "today I do day 2, after the workout I log and save"). No field is mandatory until saving.
- **Draft always saved**: every set is written to the DB at once (session without `endedAt`); closing the app or
  locking the phone loses nothing. When reopened, Workout shows "Workout in progress — Resume".
- **Editing an exercise during the workout** (Gianluca's request, 2026-10-14): the day page opens the same form as
  the editor (sets, reps, rest, position, notes, status…) and saving **returns to the day page** with the sets
  already entered intact (return parameter in the form route).
- **At the end of the day**: offer to "update the load in the plan with today's" for the exercises whose recorded kg
  differs from `ultimoKg` (the user chooses which).
- Model: `Session.outcome?: 'completed' | 'skipped'` (not indexed: no new Dexie version needed).

First step: branch `feature/f4-workout` from an updated `dev`; `SessionService` (start, save set, complete, skip) with
tests on fake-indexeddb, then the new list-based Workout page and the day page.
