import { provideHttpClient, withFetch } from '@angular/common/http';
import {
  ApplicationConfig,
  inject,
  isDevMode,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';

import { routes } from './app.routes';
import { provideAppTransloco } from './core/i18n/transloco.providers';
import { provideAppPrimeNG } from './core/theme/primeng.providers';
import { LanguageService } from './core/services/language.service';
import { AppUpdateService } from './core/services/pwa/app-update.service';
import { InstallPromptService } from './core/services/pwa/install-prompt.service';
import { StoragePersistenceService } from './core/services/storage-persistence.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withFetch()),
    provideAppTransloco(),
    provideAppPrimeNG(),
    provideAppInitializer(() => inject(LanguageService).init()),
    provideAppInitializer(() => {
      // Not awaited: the permission prompt (if any) must not delay the first render.
      void inject(StoragePersistenceService).ensurePersisted();
    }),
    // Production only: in development every change must be served fresh, not from a cache.
    // Registered once the app is stable, so the download of the cache does not slow the start.
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
    provideAppInitializer(() => {
      inject(AppUpdateService).watch();
      inject(InstallPromptService).listen();
    }),
  ],
};
