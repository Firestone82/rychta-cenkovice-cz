import { DOCUMENT } from '@angular/common';
import { Injectable, RESPONSE_INIT, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { SITE_ORIGIN } from '@config/render.config';
import { I18nService } from './i18n.service';

/** Shared picture for link previews when a page has no photo of its own. */
const DEFAULT_IMAGE = '/img/og-image.jpg';
const DESCRIPTION_LIMIT = 160;

export interface PageMeta {
  /** Picture for link previews: a path on this site or an absolute address. */
  image?: string;
  /** Open Graph type; pages are `website` unless stated. */
  type?: string;
}

/** Title, description, link previews, language alternates and structured data in <head>. */
@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly i18n = inject(I18nService);
  private readonly doc = inject(DOCUMENT);
  /** Public origin of the website, without a trailing slash. */
  readonly origin = inject(SITE_ORIGIN);
  private readonly response = inject(RESPONSE_INIT, { optional: true });

  page(title: string | null, description?: string, extra: PageMeta = {}): void {
    const site = this.i18n.t().meta.site;
    const full = title
      ? `${title} | ${site}`
      : `${site} | ${this.i18n.t().footer.tagline.replace(/\.$/, '')}`;
    const desc = shorten(description || this.i18n.t().meta.description);
    const image = this.absolute(extra.image ?? DEFAULT_IMAGE);
    const locale = this.i18n.locale().replace('-', '_');
    this.title.setTitle(full);
    this.meta.updateTag({ name: 'description', content: desc });
    this.meta.updateTag({ property: 'og:type', content: extra.type ?? 'website' });
    this.meta.updateTag({ property: 'og:title', content: full });
    this.meta.updateTag({ property: 'og:description', content: desc });
    this.meta.updateTag({ property: 'og:image', content: image });
    this.meta.updateTag({ property: 'og:locale', content: locale });
    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.meta.removeTag('name="robots"');
  }

  /** Pages of the administration and pages that do not exist stay out of search results. */
  noIndex(title: string): void {
    this.title.setTitle(`${title} | ${this.i18n.t().admin.title}`);
    this.meta.updateTag({ name: 'robots', content: 'noindex, nofollow' });
  }

  /** Answers 404 when the page is rendered on the server and keeps it out of the index. */
  notFound(): void {
    if (this.response) this.response.status = 404;
    this.meta.updateTag({ name: 'robots', content: 'noindex' });
  }

  /** Answers 503 when the page is rendered on the server without its data, so crawlers come back later. */
  unavailable(): void {
    if (this.response) this.response.status = 503;
    this.meta.updateTag({ name: 'robots', content: 'noindex' });
  }

  /**
   * The canonical address of the current page and `<link rel="alternate" hreflang>` to the
   * same page in each language, with `x-default` at the root, which picks the language.
   */
  alternates(urls: Record<string, string>, current: string): void {
    this.doc.head
      .querySelectorAll('link[rel="alternate"][hreflang], link[rel="canonical"]')
      .forEach((el) => el.remove());
    this.link('canonical', this.absolute(urls[current] ?? '/'));
    for (const [lang, href] of Object.entries(urls))
      this.link('alternate', this.absolute(href), lang);
    this.link('alternate', this.absolute('/'), 'x-default');
    const others = Object.keys(urls).filter((lang) => lang !== current);
    this.meta.getTags('property="og:locale:alternate"').forEach((el) => el.remove());
    this.meta.updateTag({ property: 'og:url', content: this.absolute(urls[current] ?? '/') });
    for (const lang of others) {
      this.meta.addTag({ property: 'og:locale:alternate', content: LOCALES[lang] ?? lang });
    }
  }

  /** Puts schema.org data into a `<script type="application/ld+json">`; null removes it. */
  structuredData(id: string, data: object | null): void {
    const elementId = `ld-${id}`;
    this.doc.getElementById(elementId)?.remove();
    if (!data) return;
    const script = this.doc.createElement('script');
    script.type = 'application/ld+json';
    script.id = elementId;
    // `<` is escaped so that no text from the database can close the script element.
    script.textContent = JSON.stringify({ '@context': 'https://schema.org', ...data }).replace(
      /</g,
      '\\u003c',
    );
    this.doc.head.appendChild(script);
  }

  /** An address on this site with the public origin in front. */
  absolute(path: string): string {
    return /^https?:\/\//.test(path)
      ? path
      : this.origin + (path.startsWith('/') ? '' : '/') + path;
  }

  private link(rel: string, href: string, hreflang?: string): void {
    const link = this.doc.createElement('link');
    link.rel = rel;
    if (hreflang) link.hreflang = hreflang;
    link.href = href;
    this.doc.head.appendChild(link);
  }
}

const LOCALES: Record<string, string> = { cs: 'cs_CZ', en: 'en_GB' };

/** Search engines show about 160 characters; longer text is cut at a word. */
function shorten(text: string): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= DESCRIPTION_LIMIT) return clean;
  const cut = clean.slice(0, DESCRIPTION_LIMIT - 1);
  return cut.slice(0, cut.lastIndexOf(' ')).replace(/[,.;:–-]+$/, '') + '…';
}
