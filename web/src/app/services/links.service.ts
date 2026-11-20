import { Injectable, inject } from '@angular/core';
import { SITE } from '@config/site.config';
import type { Lang } from '@models/i18n.model';
import type { PageKey } from '@models/site.model';
import { apartmentSlug } from '@utils/links.util';
import { I18nService } from './i18n.service';

@Injectable({ providedIn: 'root' })
export class LinksService {
  private readonly i18n = inject(I18nService);

  /** routerLink commands for a page in the current (or given) language. */
  to(
    page: PageKey,
    params: Record<string, string | number> = {},
    lang: Lang = this.i18n.lang(),
  ): string[] {
    const segments = SITE.routes[page][lang]
      .split('/')
      .filter(Boolean)
      .map((s) => (s.startsWith(':') ? String(params[s.slice(1)] ?? '') : s));
    return ['/', lang, ...segments];
  }

  apartment(number: number, lang: Lang = this.i18n.lang()): string[] {
    return this.to('apartment', { slug: apartmentSlug(number, lang) }, lang);
  }
}
