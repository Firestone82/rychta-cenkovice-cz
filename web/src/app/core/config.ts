import { InjectionToken } from '@angular/core';

function metaContent(name: string, fallback: string): string {
  const value = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)?.content?.trim();
  return (value || fallback).replace(/\/$/, '');
}

/** Base URL of the management API, read from <meta name="rc-api-base"> in index.html. */
export const API_BASE = new InjectionToken<string>('API_BASE', {
  providedIn: 'root',
  factory: () => metaContent('rc-api-base', '/api/v1'),
});

/** Base URL of the processed photos served by the API. */
export const MEDIA_BASE = new InjectionToken<string>('MEDIA_BASE', {
  providedIn: 'root',
  factory: () => metaContent('rc-api-base', '/api/v1').replace(/\/api\/v1$/, '') + '/media',
});

export const CONTACT = {
  phone: '+420 606 734 911',
  phoneHref: 'tel:+420606734911',
  email: 'rychtacenkovice@seznam.cz',
  mapGoogle: 'https://maps.app.goo.gl/JWp5b1ZGPRZ7RkUR8',
  mapSeznam: 'https://mapy.cz/zakladni?q=%C4%8Cenkovice%20106',
  facebook: 'https://www.facebook.com/apartmanycenkovice/',
} as const;
