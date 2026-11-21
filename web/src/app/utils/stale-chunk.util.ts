import type { NavigationError } from '@angular/router';

const RELOADED_KEY = 'rc-chunk-reload';

/**
 * After a new deploy the files of the previous build are gone, so a tab opened before it
 * fails to load the next page. Loads that page again from the server, once per tab and URL.
 */
export function reloadOnStaleChunk(error: NavigationError): void {
  const message = String((error.error as Error | undefined)?.message ?? error.error);
  if (
    typeof window === 'undefined' ||
    !/dynamically imported module|Loading chunk/i.test(message)
  ) {
    return;
  }
  try {
    if (sessionStorage.getItem(RELOADED_KEY) === error.url) return;
    sessionStorage.setItem(RELOADED_KEY, error.url);
  } catch {
    /* without storage the reload still happens; a second failure then stays on the page */
  }
  // reload() asks the server again even for a page the browser still holds in its cache.
  window.history.replaceState(null, '', new URL(error.url.replace(/^\//, ''), document.baseURI));
  window.location.reload();
}
