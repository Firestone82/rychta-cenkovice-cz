import type { Lang, Season } from './i18n.model';

export interface SiteLanguage {
  code: Lang;
  /** Label of the language switch. */
  short: string;
  name: string;
  /** Browser language prefixes that select this language on a first visit. */
  browser: string[];
}

export interface SiteContact {
  phone: string;
  phoneHref: string;
  email: string;
  facebook: string;
  mapGoogle: string;
  mapSeznam: string;
}

/** Postal address of the house, for search engines and maps. */
export interface SiteAddress {
  street: string;
  postalCode: string;
  locality: string;
  region: string;
  /** ISO 3166-1 alpha-2 code. */
  country: string;
}

export type PageKey =
  | 'home'
  | 'accommodation'
  | 'commonRoom'
  | 'facilities'
  | 'wellness'
  | 'apartment'
  | 'leisure'
  | 'gallery'
  | 'availability'
  | 'booking'
  | 'contact'
  | 'privacy';

/** Shape of content/site.json. */
export interface SiteContent {
  languages: SiteLanguage[];
  defaultLanguage: Lang;
  /** Used when the browser language matches no `languages[].browser` prefix. */
  fallbackLanguage: Lang;
  contact: SiteContact;
  address: SiteAddress;
  media: {
    /** Keys of content/images.json. */
    hero: Record<Season, string>;
    seasons: Record<Season, string>;
    aerialVideo: { src: string; poster: string };
  };
  /** URL segment of every public page per language; `:slug` marks a parameter. */
  routes: Record<PageKey, Record<Lang, string>>;
  /** Apartment URLs are `<prefix>-<number>`. */
  apartmentSlug: Record<Lang, string>;
  /** Addresses of the previous website, redirected to the new ones. */
  legacyRedirects: Record<string, string>;
}
