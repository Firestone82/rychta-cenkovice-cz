import { Injectable, inject } from '@angular/core';
import { I18n } from './i18n/i18n';
import type { Lang } from './i18n/types';

/** Every public page, with its URL segment in both languages. */
export const PAGES = {
  home: { cs: '', en: '' },
  accommodation: { cs: 'ubytovani', en: 'accommodation' },
  commonRoom: { cs: 'ubytovani/spolecenska-mistnost', en: 'accommodation/common-room' },
  facilities: { cs: 'ubytovani/zazemi-objektu', en: 'accommodation/facilities' },
  wellness: { cs: 'ubytovani/domaci-wellness', en: 'accommodation/wellness' },
  apartment: { cs: 'ubytovani/:slug', en: 'accommodation/:slug' },
  leisure: { cs: 'volny-cas', en: 'things-to-do' },
  gallery: { cs: 'fotogalerie', en: 'gallery' },
  availability: { cs: 'obsazenost', en: 'availability' },
  booking: { cs: 'rezervace', en: 'booking' },
  contact: { cs: 'kontakt', en: 'contact' },
  news: { cs: 'novinky', en: 'news' },
  privacy: { cs: 'ochrana-osobnich-udaju', en: 'privacy' },
} as const;

export type PageKey = keyof typeof PAGES;

/** Apartment slugs differ per language: apartman-3 (cs) / apartment-3 (en). */
export function apartmentSlug(number: number, lang: Lang): string {
  return `${lang === 'cs' ? 'apartman' : 'apartment'}-${number}`;
}

export function apartmentNumber(slug: string | null | undefined): number | null {
  const match = /-(\d+)$/.exec(slug ?? '');
  return match ? Number(match[1]) : null;
}

@Injectable({ providedIn: 'root' })
export class Links {
  private readonly i18n = inject(I18n);

  /** routerLink commands for a page in the current (or given) language. */
  to(
    page: PageKey,
    params: Record<string, string | number> = {},
    lang: Lang = this.i18n.lang(),
  ): string[] {
    const segments = PAGES[page][lang]
      .split('/')
      .filter(Boolean)
      .map((s) => (s.startsWith(':') ? String(params[s.slice(1)] ?? '') : s));
    return ['/', lang, ...segments];
  }

  apartment(number: number, lang: Lang = this.i18n.lang()): string[] {
    return this.to('apartment', { slug: apartmentSlug(number, lang) }, lang);
  }
}
