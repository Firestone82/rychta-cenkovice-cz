import { DOCUMENT } from '@angular/common';
import {
  InjectionToken,
  REQUEST,
  REQUEST_CONTEXT,
  TransferState,
  inject,
  makeStateKey,
} from '@angular/core';

/** What the process that renders pages on the server passes to the website (see `src/server.ts`). */
export interface RenderContext {
  /** Where the server itself reaches the API, e.g. `http://127.0.0.1:8080`. */
  apiOrigin?: string;
  /** Public address of the website, for canonical links and the sitemap. */
  siteUrl?: string;
}

export function renderContext(): RenderContext {
  return (inject(REQUEST_CONTEXT, { optional: true }) as RenderContext | null) ?? {};
}

const ORIGIN_KEY = makeStateKey<string>('site-origin');

/**
 * Public origin of the website without a trailing slash. The server hands its value to the
 * browser, so canonical links stay the same after the page takes over.
 */
export const SITE_ORIGIN = new InjectionToken<string>('SITE_ORIGIN', {
  providedIn: 'root',
  factory: () => {
    const state = inject(TransferState);
    const request = inject(REQUEST, { optional: true });
    if (!request) return state.get(ORIGIN_KEY, inject(DOCUMENT).location.origin);
    const origin = (renderContext().siteUrl ?? new URL(request.url).origin).replace(/\/+$/, '');
    state.set(ORIGIN_KEY, origin);
    return origin;
  },
});
