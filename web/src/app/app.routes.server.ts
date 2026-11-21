import { RenderMode, type ServerRoute } from '@angular/ssr';
import { SITE } from './config/site.config';

/** Addresses of the old website answer 301, so search engines move their ranking to the new page. */
const legacyRedirects: ServerRoute[] = Object.keys(SITE.legacyRedirects).map((path) => ({
  path,
  renderMode: RenderMode.Server,
  status: 301,
}));

/** The website is rendered on the server for visitors and search engines; the administration only in the browser. */
export const serverRoutes: ServerRoute[] = [
  { path: 'admin', renderMode: RenderMode.Client },
  { path: 'admin/**', renderMode: RenderMode.Client },
  ...legacyRedirects,
  { path: '**', renderMode: RenderMode.Server },
];
