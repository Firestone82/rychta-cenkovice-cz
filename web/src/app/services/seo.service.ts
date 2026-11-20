import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { I18nService } from './i18n.service';

@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly i18n = inject(I18nService);
  private readonly doc = inject(DOCUMENT);

  page(title: string | null, description?: string): void {
    const site = this.i18n.t().meta.site;
    const full = title
      ? `${title} | ${site}`
      : `${site} | ${this.i18n.t().footer.tagline.replace(/\.$/, '')}`;
    const desc = description ?? this.i18n.t().meta.description;
    this.title.setTitle(full);
    this.meta.updateTag({ name: 'description', content: desc });
    this.meta.updateTag({ property: 'og:title', content: full });
    this.meta.updateTag({ property: 'og:description', content: desc });
    this.meta.updateTag({ property: 'og:locale', content: this.i18n.locale().replace('-', '_') });
    this.meta.removeTag('name="robots"');
  }

  noIndex(title: string): void {
    this.title.setTitle(`${title} | ${this.i18n.t().admin.title}`);
    this.meta.updateTag({ name: 'robots', content: 'noindex, nofollow' });
  }

  /** <link rel="alternate" hreflang> pointing at the same page in each language. */
  alternates(urls: Record<string, string>): void {
    this.doc.head.querySelectorAll('link[rel="alternate"][hreflang]').forEach((el) => el.remove());
    for (const [lang, href] of Object.entries(urls)) {
      const link = this.doc.createElement('link');
      link.rel = 'alternate';
      link.hreflang = lang;
      link.href = this.doc.location.origin + href;
      this.doc.head.appendChild(link);
    }
  }
}
