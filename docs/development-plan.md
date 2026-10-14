# J-Training — Development plan by phases

Last updated: 2026-10-15 (phases F2–F5 revised at Gianluca's request; F5 includes the fixes from the F4 phone test; F5 and F6 delivered in a single PR, with rest between exercises and a continuous alarm; F8 with a backup reminder; v1.0.0 released; F9 for the TWA APK evaluated and cancelled)

## Project identity
- App name: J-Training
- GitHub repository: `j-training` (public, required for free GitHub Pages)
- Local folder: `A:\Personal dev projects\j-training`
- Production URL: `https://<user>.github.io/j-training/` (`base-href` = `/j-training/`)
- GitHub management: GitHub CLI (`gh`). The initial repository setup (branches, protection rules, Pages) was done
  in F0 with a PowerShell script, removed after v1.0.0 and still available in the git history

## Pinned versions
- Node 24.x
- Angular 21.2.x and Angular CLI 21 (not 22: PrimeNG 21 requires @angular/core ^21)
- PrimeNG 21.1.x (MIT) + @primeuix/themes
- @jsverse/transloco 8.x · dexie 4.4.x · papaparse 5.x · exceljs 4.4.x
- Unit tests: Vitest (Angular 21 default) + fake-indexeddb
- E2E: Playwright (from F2)
- Lint: angular-eslint · Formatting: Prettier

## Branching
- `master`: protected. PRs only, no direct pushes, no force pushes, no deletion. It is production.
- `dev`: protected with the same rules. It is the default branch of the repository.
- `feature/fX-description`: merged into `dev` with **squash**.
- Release: PR `dev` → `master` with a **merge commit**. `master` therefore also holds the release merge commits,
  while the files of the two branches are the same.
- Automatic deploy to GitHub Pages on every push to `master`.
- Required approvals on PRs: 0. Gianluca works alone and GitHub does not allow approving your own PRs. Protection
  comes from mandatory PRs and CI checks.

## Phases

| Phase | Goal | Verifiable output |
|---|---|---|
| F0 | Environment, scaffold, quality, repository and protections, CI, deploy | `ng serve` works; CI green on PRs; Pages publishes the start page |
| F1 | Core: models, Dexie, repositories, persistent storage, Italian/English i18n, mobile shell (bottom nav, theme), settings | Runtime language switch; DB visible in DevTools > IndexedDB |
| F2 | CSV import: parsing, validation, preview, archive/activate transaction, Day 1..N, weekday link. Named plans archive (activate/archive). The workout page shows only the day suggested for today, with the choice of another day | Import of a real plan; re-import = a single active phase; old plans can be reactivated |
| F3 | Plan editor: creation from scratch without CSV; rename/delete a plan; add/edit/reorder/delete days and exercises (every field, equipment position and rest included, with defaults by type: compound 150 s, isolation 75 s); 4 statuses; soft delete | Plan created by hand and usable; full CRUD; "removed" hidden but history intact |
| F4 | Workout: list of days as labels with a ▶ button that opens the **day page** (today's one proposed); on the day page: session, kg/reps log per set (during or after the workout), prefill, draft saved at every set and resume of the workout in progress, discrepancies saved, **editing an exercise during the workout** (editor form, then back to the day), **save day** and **skip day** (the rotation moves on), offer to update the load in the plan | Complete session saved and reopenable; skipped day recorded; no data lost closing the app halfway |
| F5 | Fixes from the F4 test: **save the day even without ticks**, **remove sets**, smaller and quieter icons, active/archived **toggle** in Plans. Rest timer per exercise: Web Worker, timestamps, sound, vibration, wake lock, editable time | Day filled in after the workout is saved; accurate timer even after a short time in the background |
| F6 | History per exercise and analytics: load progression at equal reps, weekly reps | Charts with realistic test data |
| F7 | CSV/XLSX export of a phase, JSON backup/restore | Files opened in Excel; restore on another browser identical to the original |
| F8 | PWA and release: service worker, manifest, icons, install prompt, new version notice, "Last backup" in the settings with a reminder after a week, MIT license, Android test, v1.0.0 | App installed on the phone and working offline; storage "Protected" |
| F9 | ~~Android APK as a Trusted Web Activity (Bubblewrap)~~ **Cancelled** (2026-10-15): the app installed from Chrome already is an Android package (WebAPK) with the same data, offline support and automatic updates; the steps to build it in the future are in `docs/handoff/handoff-F9.md` | — |

## Test strategy
- **Unit (Vitest)**: services and repositories, CSV mapping, prefill rules, analytics calculations. Dexie tested with fake-indexeddb.
- **Components**: only components with non-trivial presentation logic.
- **E2E (Playwright, Pixel mobile profile)**: from F2 on, one main flow per phase; the PWA is tested offline on the production build.
- **CSV fixtures**: anonymised and made up. The repository is public: Gianluca's real plan must not be committed.
- **Manual test at the end of each phase**:
  - Desktop: Chrome DevTools in device mode.
  - Real phone: USB debugging + `chrome://inspect` with port forwarding of `localhost:4200` (the service worker needs HTTPS or localhost).
  - After the deploy: test on the GitHub Pages URL.

## Handoff template (`docs/handoff/handoff-FX.md`)
`handoff-FX.md` is the **entry** document of phase X: it is written at the end of phase X-1
and read at the start of the phase X session.
```
# Handoff FX — <title>
Date:
Branch / last commit:
## Done
## Decisions (and why)
## Files created/changed (paths)
## Test status (unit / e2e / manual)
## Open issues / technical debt
## Next phase: goal and first step
```
