# Handoff F5 — F4 fixes and rest timer

Date: 2026-10-14
Branch / last commit: `feature/f4-workout` (PR → `dev`); `dev` contains F1 (#5), F2 (#6), F3 (#7); `master` = F0 release

## Done (F4 — Workout)
- **Workout** (`/workout`) is the list of the active plan's days: "Day N" label, name, weekday, number of
  exercises, **last session** ("Last: 15/10/26 · completed/skipped") and a ▶ button.
  The proposed day (`suggestDay`) is highlighted with "Today" / "Next". A **"Workout in progress — Resume"** card.
- **Day page** (`/workout/day/:dayId`): for every exercise the plan (sets × reps, rest, RIR), equipment and
  position, notes, and one row per set with **kg** and **reps** prefilled and a **✓**. "Add set" beyond the plan,
  "Mark all done" to log everything at the end of the workout.
- **Prefill**: kg from today's set already done, keeping the "steps" of the previous session (pyramids:
  60 → 65 last time, 62.5 → 67.5 today); otherwise the same set of the last session with the same name;
  otherwise `ultimoKg`; an active exercise without a load = bodyweight (0 kg); "to test" stays empty.
  Reps from the plan ("8-10" → 8, pyramid "12-10-8" → one per set).
- **Draft**: the first ticked set creates the session (without `endedAt`), every set is written to the DB at once.
  Only one workout in progress: opening another day shows a notice with "Go to the workout in progress" / "Discard draft".
- **Save day**: summary with the recorded sets, a warning about unticked sets and an **offer to update the load in
  the plan** (heaviest set of the day, all selected, the user chooses). **Skip day** with confirmation. Both move the
  rotation on. **Discard draft** with confirmation.
- **Editing an exercise during the workout**: pencil → editor form with `?returnTo=/workout/day/:id`; saving returns
  to the day with recorded sets and typed values intact.
- Text of `warn` messages brought to AA contrast in the theme (yellow 800: 6.6:1).

## Decisions (and why)
- **Aggregate `WorkoutSessionRepository`**: sessions and sets, transactions for record / save (+ loads in the plan) /
  skip / discard; the "at most one open session" invariant lives in one place. `endedAt` is not indexed:
  a table scan, negligible for a personal log (no new Dexie version).
- **`Session.outcome`** (`completed` | `skipped`), not indexed. The rotation only considers finished sessions:
  a draft does not move the proposed day on.
- **The session starts with the first set**: opening a day to look at it leaves no empty draft; removing the last
  set deletes the draft.
- **Inputs as text** (`inputmode="decimal"`), not `type="number"`: the binding does not rewrite what the user is
  typing ("62," towards "62,5") and both comma and dot are accepted.
- **Unticked values in memory** (`WorkoutDrafts`, root): they survive the round trip through the exercise form,
  not a forced close of the app. Ticked sets are in the DB. Persisting unticked values too would have put UI state
  in the data model.
- **Store per page** (`WorkoutDayStore`, provided by the page): live data + typed values with `computed()`;
  pure functions for rows, parsing, prefill and load offers.
- **Whitelisted `returnTo`** (`/workout/day/<number>`): no arbitrary redirect from the query parameter.
- **Deleting a day closes its draft as completed** instead of leaving it orphaned.
- **Weekday** no longer editable from the Workout page (it stays in the plan detail and in the editor).

## Files created/changed (paths)
- `src/app/core/models/{session,workout}.model.ts`
- `src/app/core/repositories/{workout-session,session,plan-editor}.repository.ts`
- `src/app/core/services/{workout-session,workout-plan}.service.ts`, `src/app/core/services/workout/{set-prefill,load-updates}.ts`
- `src/app/features/workout/**` (list, `day-item/`, `day/` with store, rows, exercise log, end-of-day dialog);
  `day-picker/` removed
- `src/app/features/plans/exercise/exercise-form-page.*` (`returnTo`), `src/app/shared/ui/exercise-item/exercise-status.ts`
- `src/app/core/theme/j-training.preset.ts`, `src/app/app.routes.ts`, `public/i18n/*.json`
- `e2e/workout.spec.ts`, `e2e/fixtures/scheda-rotazione.csv`, `e2e/plan-{import,editor}.spec.ts`

## Test status (unit / e2e / manual)
- Unit: 161/161 (sessions repository: draft, a single one in progress, atomic save with loads, skip, discard,
  previous sets; prefill and pyramids; load offers; rotation with skipped days; rows and parsing; store).
- E2E: 18/18 (6 new: list and rotation, draft after reload and save with load update, skip, editing an exercise
  mid-workout, everything at the end and prefill the next time, a single workout in progress).
- Manual: built-in browser at 390 px ok. **Real phone (Gianluca, 2026-10-14)**: UI ok, but **"Save day" does not
  save** in the "fill everything in at the end" flow: the button stays disabled until at least one set is ticked
  (reproduced with touch taps on the Pixel 7 profile). It deviates from the F4 spec ("no field is mandatory until
  saving"): first item of F5, as Gianluca asked.

## Open issues / technical debt
- **Save day without ticks** (see above): to be fixed in F5.
- **MIT license** to be added. **Release to `master`** of F1–F4 still to do.
- **APK with Capacitor** + automatic backup to file (F7/F8).
- Opening the exercise form from the workout highlights "Plans" in the bottom nav (the URL is `/plans/...`).
- `<select>` elements inside a `<label>` get label + selected value as their accessible name (standard behaviour).

## Next phase: goal and first step
**F5 — Fixes from the F4 test + rest timer** (Gianluca's requests, 2026-10-14):
1. **Save the day even without ticks**: in the summary, unticked sets with complete values can be saved with the
   values shown (the default choice when no set is ticked); atomic save (sets + closing + loads in the plan) in a
   single transaction.
2. **Remove sets** in the session, besides adding them (even below the number planned).
3. **More modern UI**: no large, stylised icons (filled orange ▶, large ✓, empty-state icon); smaller, quieter
   grey icons, keeping a touch area ≥ 44 px and contrast ≥ 3:1 for control icons.
4. **Plans**: the active/archived state becomes a **toggle** (PrimeNG 21 `ToggleSwitch`) instead of the
   "Make active" / "Archive" buttons, in the list and in the detail; still only one active plan by construction.
5. **Rest timer** per exercise (the original F5 goal): Web Worker, timestamp-based countdown, sound (first) and
   vibration, wake lock, default time from `recSec`, editable.

First step: branch `feature/f5-rest-timer` (from the tip of `feature/f4-workout`, to be rebased on `dev` after the F4
PR is merged); fix of the save with tests on fake-indexeddb and an E2E of the "everything at the end" flow.
