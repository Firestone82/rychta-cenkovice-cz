import { SITE } from '@config/site.config';
import type { Lang } from '@models/i18n.model';
import type { PageKey } from '@models/site.model';
import { apartmentSlug } from './links.util';

/** Pages that are worth a place in search results, in the order of the sitemap. */
const PAGES: PageKey[] = [
  'home',
  'accommodation',
  'commonRoom',
  'facilities',
  'wellness',
  'leisure',
  'gallery',
  'availability',
  'booking',
  'contact',
  'privacy',
];

function path(page: PageKey, lang: Lang, slug = ''): string {
  const route = SITE.routes[page][lang].replace(':slug', slug);
  return `/${lang}${route ? '/' + route : ''}`;
}

function entry(origin: string, paths: Record<Lang, string>): string[] {
  const links = SITE.languages.map(
    ({ code }) =>
      `    <xhtml:link rel="alternate" hreflang="${code}" href="${origin}${paths[code]}"/>`,
  );
  return SITE.languages.map(({ code }) =>
    [`  <url>`, `    <loc>${origin}${paths[code]}</loc>`, ...links, `  </url>`].join('\n'),
  );
}

/** sitemap.xml with every public page and apartment in each language, linked to each other. */
export function sitemapXml(origin: string, apartments: number[]): string {
  const byLang = (fn: (lang: Lang) => string) =>
    Object.fromEntries(SITE.languages.map(({ code }) => [code, fn(code)])) as Record<Lang, string>;
  const urls = [
    ...PAGES.flatMap((page) =>
      entry(
        origin,
        byLang((lang) => path(page, lang)),
      ),
    ),
    ...apartments.flatMap((n) =>
      entry(
        origin,
        byLang((lang) => path('apartment', lang, apartmentSlug(n, lang))),
      ),
    ),
  ];
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...urls,
    '</urlset>',
    '',
  ].join('\n');
}

/** robots.txt: the website is open to every crawler, the administration and the API are not. */
export function robotsTxt(origin: string): string {
  return [
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin',
    'Disallow: /api/',
    '',
    `Sitemap: ${origin}/sitemap.xml`,
    '',
  ].join('\n');
}
