import { DOCUMENT } from '@angular/common';
import { InjectionToken, inject } from '@angular/core';
import { DEMO } from './demo.config';

function metaContent(name: string, fallback: string): string {
  const value = inject(DOCUMENT)
    .querySelector<HTMLMetaElement>(`meta[name="${name}"]`)
    ?.content?.trim();
  return (value || fallback).replace(/\/$/, '');
}

/** Base URL of the management API, read from <meta name="rc-api-base"> in index.html. */
export const API_BASE = new InjectionToken<string>('API_BASE', {
  providedIn: 'root',
  factory: () => metaContent('rc-api-base', '/api/v1'),
});

/** Base URL of the processed photos served by the API; the showcase bundles a copy. */
export const MEDIA_BASE = new InjectionToken<string>('MEDIA_BASE', {
  providedIn: 'root',
  factory: () =>
    DEMO
      ? 'demo/media'
      : metaContent('rc-api-base', '/api/v1').replace(/\/api\/v1$/, '') + '/media',
});
