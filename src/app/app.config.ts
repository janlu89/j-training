import { provideHttpClient, withFetch } from '@angular/common/http';
import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';

import { routes } from './app.routes';
import { provideAppTransloco } from './core/i18n/transloco.providers';
import { provideAppPrimeNG } from './core/theme/primeng.providers';
import { LanguageService } from './core/services/language.service';
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
  ],
};
