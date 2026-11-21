import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { CookieConsentComponent } from '@components/cookie-consent/cookie-consent.component';
import { SITE } from '@config/site.config';
import type { Lang } from '@models/i18n.model';
import type { PageKey } from '@models/site.model';
import { I18nService } from '@services/i18n.service';
import { LinksService } from '@services/links.service';
import { SeoService } from '@services/seo.service';
import { apartmentNumber, apartmentSlug, commandsToPath } from '@utils/links.util';
import { lodgingBusiness } from '@utils/structured-data.util';
import { filter } from 'rxjs';
import { SiteFooterComponent } from './site-footer/site-footer.component';
import { SiteHeaderComponent } from './site-header/site-header.component';

@Component({
  selector: 'rc-site-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, CookieConsentComponent, SiteHeaderComponent, SiteFooterComponent],
  templateUrl: './site.layout.html',
  styleUrl: './site.layout.scss',
})
export class SiteLayout {
  private readonly i18n = inject(I18nService);
  protected readonly t = this.i18n.t;

  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly links = inject(LinksService);
  private readonly current = signal<{ page: PageKey; params: Record<string, string> }>({
    page: 'home',
    params: {},
  });

  /** The current page in every language. Apartment slugs are translated too. */
  protected readonly alternates = computed(() => {
    const { page, params } = this.current();
    const entries = SITE.languages.map(({ code }) => {
      const p = { ...params };
      const number = apartmentNumber(p['slug']);
      if (page === 'apartment' && number) p['slug'] = apartmentSlug(number, code);
      return [code, this.links.to(page, p, code)] as const;
    });
    return Object.fromEntries(entries) as Record<Lang, string[]>;
  });

  constructor() {
    const seo = inject(SeoService);
    this.readRoute();
    let initial = !this.router.navigated;
    let lastPath = this.path();
    this.router.events
      .pipe(
        filter((e) => e instanceof NavigationEnd),
        takeUntilDestroyed(inject(DestroyRef)),
      )
      .subscribe(() => {
        this.readRoute();
        // A new page moves focus to its start, so keyboard and screen-reader users notice it.
        // Not on first load, for in-page anchors or when only the query changed.
        const path = this.path();
        if (initial) initial = false;
        else if (path !== lastPath && !this.router.parseUrl(this.router.url).fragment)
          document.getElementById('main')?.focus({ preventScroll: true });
        lastPath = path;
      });

    effect(() => {
      const urls = Object.entries(this.alternates()).map(
        ([lang, commands]) => [lang, commandsToPath(commands)] as const,
      );
      const lang = this.i18n.lang();
      seo.alternates(Object.fromEntries(urls), lang);
      seo.structuredData('business', lodgingBusiness(seo.origin, `/${lang}`, this.t()));
    });
  }

  /** Moves focus to the main content without changing the URL fragment. */
  protected skip(event: Event): void {
    event.preventDefault();
    document.getElementById('main')?.focus();
  }

  private path(): string {
    return this.router.url.split(/[?#]/)[0];
  }

  private readRoute(): void {
    let r = this.route.snapshot;
    while (r.firstChild) r = r.firstChild;
    this.current.set({
      page: (r.data['page'] as PageKey | undefined) ?? 'home',
      params: r.params as Record<string, string>,
    });
  }
}
