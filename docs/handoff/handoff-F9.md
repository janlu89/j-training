# Handoff F9 — State after v1.0.0 (F9 not needed)

Date: 2026-10-15
Branch / last commit: `dev` contains F1–F8 (#5–#11); `master` = release **v1.0.0** (#12, tag `v1.0.0`), published
at <https://janlu89.github.io/j-training/>. F9 (TWA APK) cancelled by Gianluca: see the last section.

## Done (F8 — PWA and release)
- **Last backup** in Settings → Backup: "Last backup: 3 days ago" (today, yesterday, days, weeks, months,
  in the app language) or "No backup from this device yet".
- **Backup reminder** at the bottom of the Workout page, only when saved or skipped workouts are in no backup, at
  least a week after the last backup (or after the first of those workouts, if no backup was ever made).
  "Export backup" in one tap; "Later" postpones it by a week. Restoring a backup counts as a backup made on the
  file's date.
- **PWA**: Angular service worker with every app file cached on install (ExcelJS, translations and the icon font
  included), manifest (`standalone`, blue `#14213d`, regular and maskable icons), works offline even when an inner
  address is opened (e.g. `/plans`).
- **Icons** drawn once in SVG (orange bar and "J", as in the header) and rendered to PNG by
  `scripts/generate-icons.mjs`; the old `favicon.ico` with the Angular logo is gone.
- **Settings → App**: "Install the app" when the browser allows it, instructions for iPhone, the state
  "You are using the installed app", **version 1.0.0**. After the install the app asks for persistent storage again.
- **New version available**: a bar under the header with "Update" when the service worker has downloaded a new
  version; the check also runs when the app comes back to the foreground.
- **MIT license**, `package.json` 1.0.0, portfolio README (features, install, choices and why, commands).
- **Editor fix** (F3 bug): renaming a day and changing its weekday right after no longer brings the old name back;
  the E2E that failed now and then passes 40 times out of 40.
- Development plan with the new **F9** (TWA APK); architecture with distribution and reminder.

## Decisions (and why)
- **No `ng add @angular/pwa`**: 21.2.26 had been out for 8 days (rule: at least 2 weeks) and the schematic only
  generates a few files, written by hand. Runtime dependency: `@angular/service-worker` 21.2.25.
- **Everything prefetched, ExcelJS included** (218 kB compressed): there is often no signal in a gym and the export
  must work offline from the first time; a one-off cost at install. It changes the "lazy" suggestion of the F8
  handoff.
- **Registration once the app is stable** (`registerWhenStable:30000`): downloading the cache does not slow down the
  first start.
- **The user chooses when to update**: never an automatic reload while a workout is being typed;
  `activateUpdate` + reload. The only exception is a cache that can no longer be served (`unrecoverable`), where the
  network is needed.
- **Install button in the settings** instead of the browser's mini-infobar (`beforeinstallprompt` held back):
  less intrusive, and the section explains why it is worth it.
- **Reminder with three conditions** (something to save, a week since the last backup, a week since "Later"): it
  does not bother whoever has no new data. The dates live in the device settings (non-indexed fields, no new Dexie
  version) and are read together with the sessions in a single live query, so the reminder follows every save,
  export and restore.
- **`SettingsRepository.merge`**: one place for "change one preference, keep the others, store the current language
  if nothing was saved yet"; the rest between exercises uses it too.
- **Icons without fonts or dependencies**: the "J" is an SVG path, rendered by the Chromium that Playwright already
  installs; in the maskable icons the mark fills 72%, inside the safe zone.
- **PWA E2E on the real build**: the Pages build served under `/j-training/` by a 60-line Node server
  (`scripts/serve-dist.mjs`) with the same fallback as `404.html`; the test waits until the cache holds every file
  listed in `ngsw.json`, then goes offline. The deploy uses the same `npm run build:pages`.
- **`updateDay` writes only the given fields**: the page no longer writes back a value read before another change
  (lost update).

## Files created/changed (paths)
- `ngsw-config.json`, `public/manifest.webmanifest`, `public/icons/**`, `src/index.html`, `angular.json`
- `src/app/app.{config,ts,html,spec.ts}`, `src/app/core/layout/update-banner/update-banner.ts`
- `src/app/core/services/pwa/{app-update,install-prompt}.service.ts` (+ spec), `src/app/core/app-version.ts`
- `src/app/features/settings/app-section/app-section.ts`, `src/app/features/settings/settings-page.{ts,html}`
- `src/app/core/services/backup/{backup-reminder,backup-status.service}.ts` (+ spec), `backup.service.ts`
- `src/app/core/repositories/{backup,settings,plan-editor}.repository.ts`, `src/app/core/models/{backup,settings}.model.ts`
- `src/app/features/workout/backup-reminder/**`, `src/app/features/settings/backup/**`, `src/app/shared/pipes/days-ago.pipe.ts`
- `src/app/features/plans/edit/plan-editor-page.ts`, `src/app/core/services/rest-timer/rest-settings.service.ts`
- `scripts/{generate-icons,serve-dist}.mjs`, `playwright.config.ts`, `e2e/{pwa,backup-reminder}.spec.ts`
- `.github/workflows/deploy.yml`, `package.json` (1.0.0, MIT, `build:pages`, `@angular/service-worker`), `LICENSE`, `README.md`
- `public/i18n/{it,en}.json`, `docs/development-plan.md`, `docs/architecture.md`

## Test status (unit / e2e / manual)
- Unit: 313/313 (reminder rule, backup status on fake-indexeddb, "days ago" in Italian and English, updates with a
  fake `SwUpdate`, install with fake events for Android and iPhone, version equal to `package.json`, day fields
  updated separately).
- E2E: 32/32. `pixel` project (development server): +1 reminder over 30 days with `page.clock` (appears after 8
  days, "Later", back after a week, export, then silence without new data). `pwa` project (production build):
  manifest and icons; offline after the first load, with a lazy page, translations and an inner link.
- Production build: initial bundle 611 kB (budget 650).
- Manual: phone on GitHub Pages (Gianluca, 2026-10-15): ok. Installed from Chrome, opens from its icon, works
  offline, storage "Protected", data moved from the old local network address with the backup.
  Release `v1.0.0` published on GitHub.

## Open issues / technical debt
- **Development servers in the same folder share the Vite cache** (`.angular/cache`): after installing a dependency
  a server already running, the E2E one included, can serve two copies of Angular. Restart the servers after every
  `npm install`. In CI the cache is disabled (`CI=true`).
- `npm audit`: 2 moderate from `uuid` inside ExcelJS (see the F8 handoff).
- Wake lock and persistent storage to be checked on HTTPS (GitHub Pages).
- Notifications with the app in the background not planned.
- Inherited: typed but unticked values only in memory; bottom nav on "Plans" in the exercise form opened from the
  workout; other `<select>` inside `<label>`; CSV with a double click in Italian Excel.

## Next phase: goal and first step
**No phase planned.** F9 (Android APK as a Trusted Web Activity) was cancelled by Gianluca on 2026-10-15.
The app installed from Chrome already is an Android package (WebAPK): it opens full screen from its icon, works
offline, has "Protected" storage and updates by itself. A TWA APK would have used Chrome's same data for the same
site, only adding an `.apk` file to distribute, at the cost of one more repository and a signing key to look after.

Possible future work: the technical debt above. Should the APK ever be needed (for example for the Play Store),
the steps are:
1. create the `janlu89.github.io` repository, because `/.well-known/assetlinks.json` must sit at the domain root;
2. choose the package id (e.g. `io.github.janlu89.jtraining`), which can never change afterwards;
3. have Gianluca create the signing key, kept outside the repository (only its SHA-256 fingerprint goes in the file);
4. build the APK with Bubblewrap: `npx @bubblewrap/cli@1.25.0`, the latest version at least 2 weeks old on
   2026-10-15. Bubblewrap downloads JDK 17 and the Android SDK by itself; the PC only has Java 8.
