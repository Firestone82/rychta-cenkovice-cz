import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import type { ApplicationConfig } from '@angular/core';
import { provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideClientHydration, withNoIncrementalHydration } from '@angular/platform-browser';
import {
  provideRouter,
  withComponentInputBinding,
  withInMemoryScrolling,
  withViewTransitions,
} from '@angular/router';
import { routes } from './app.routes';
import { DEMO } from './config/demo.config';
import { authInterceptor } from './interceptors/auth.interceptor';
import { demoInterceptor } from './interceptors/demo.interceptor';
import { serverApiInterceptor } from './interceptors/server-api.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // Without incremental hydration Angular adds no inline script, which the security policy forbids.
    provideClientHydration(withNoIncrementalHydration()),
    provideHttpClient(
      withFetch(),
      withInterceptors(DEMO ? [demoInterceptor] : [authInterceptor, serverApiInterceptor]),
    ),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' }),
      withViewTransitions({ skipInitialTransition: true }),
    ),
  ],
};
