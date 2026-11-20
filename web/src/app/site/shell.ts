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
import {
  ActivatedRoute,
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { filter } from 'rxjs';
import { CONTACT } from '../core/config';
import { I18n } from '../core/i18n/i18n';
import type { Lang } from '../core/i18n/types';
import { Links, PageKey, apartmentNumber, apartmentSlug } from '../core/links';
import { Seo } from '../core/seo';
import { Icon } from '../ui/icon';
import { Logo } from '../ui/logo';
import { Consent } from '../core/consent';
import { CookieConsent } from './cookie-consent';

/** Header, footer and the outlet of every public page. */
@Component({
  selector: 'rc-site-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Logo, Icon, CookieConsent],
  host: { '(window:scroll)': 'onScroll()', '(document:keydown.escape)': 'menuOpen.set(false)' },
  template: `
    <a class="skip" href="#main" (click)="skip($event)">{{ t().common.skip }}</a>
    <rc-cookie-consent />

    <header class="header" [class.is-scrolled]="scrolled()" [class.is-open]="menuOpen()">
      <div class="wrap bar">
        <a class="brand" [routerLink]="links.to('home')">
          <rc-logo />
          <span class="sr-only">, {{ t().nav.home }}</span>
        </a>

        <nav class="nav" [attr.aria-label]="t().common.menu" id="site-nav">
          <ul>
            @for (item of nav(); track item.page) {
              <li>
                <a
                  [routerLink]="links.to(item.page)"
                  routerLinkActive="is-active"
                  ariaCurrentWhenActive="page"
                  (click)="menuOpen.set(false)"
                  >{{ item.label }}</a
                >
              </li>
            }
          </ul>
          <div class="tools">
            <ul class="langs" [attr.aria-label]="t().common.language">
              @for (l of langs; track l.code) {
                <li>
                  <a
                    [routerLink]="otherUrl()[l.code]"
                    queryParamsHandling="preserve"
                    [attr.lang]="l.code"
                    [attr.hreflang]="l.code"
                    [attr.aria-current]="i18n.lang() === l.code ? 'true' : null"
                    (click)="menuOpen.set(false)"
                    >{{ l.short }}<span class="sr-only"> {{ l.name }}</span></a
                  >
                </li>
              }
            </ul>
            <a
              class="btn btn-small book"
              [routerLink]="links.to('booking')"
              (click)="menuOpen.set(false)"
              >{{ t().nav.book }}</a
            >
          </div>
        </nav>

        <button
          type="button"
          class="toggle"
          [attr.aria-expanded]="menuOpen()"
          aria-controls="site-nav"
          (click)="menuOpen.set(!menuOpen())"
        >
          <rc-icon [name]="menuOpen() ? 'close' : 'menu'" />
          <span>{{ menuOpen() ? t().common.close : t().common.menu }}</span>
        </button>
      </div>
    </header>

    <main id="main" tabindex="-1">
      <router-outlet />
    </main>

    <footer class="footer on-dark">
      <svg
        class="ridge"
        viewBox="0 0 1440 150"
        preserveAspectRatio="none"
        aria-hidden="true"
        focusable="false"
      >
        <path
          class="far"
          d="M0 150V96l120-52 96 40 150-78 132 70 84-30 168 74 110-58 130 40 150-66 140 62 160-50v102z"
        />
        <path
          class="near"
          d="M0 150v-30l210-58 120 34 96-22 150 46 174-70 130 52 190-40 150 50 220-34v72z"
        />
      </svg>
      <svg class="house" viewBox="0 0 120 96" aria-hidden="true" focusable="false">
        <path class="smoke" d="M82 20c-4-6 5-9 1-15" />
        <path class="chimney" d="M78 22h8v18h-8z" />
        <path class="roof" d="M60 6 110 72H10z" />
        <path class="boards" d="M30 72 60 30l30 42M45 72l15-21 15 21" />
        <path class="plinth" d="M16 72h88v24H16z" />
        <path class="lit" d="M28 79h12v10H28zM54 79h12v10H54zM80 79h12v10H80zM54 52h12v10H54z" />
      </svg>

      <div class="wrap">
        <div class="top">
          <div class="reach">
            <rc-logo class="flogo" />
            <p class="tagline">{{ t().footer.tagline }}</p>
            <a class="phone num" [href]="contact.phoneHref">{{ contact.phone }}</a>
            <a class="mail" [href]="'mailto:' + contact.email">{{ contact.email }}</a>
            <address>
              @for (line of t().contact.address; track line) {
                <span>{{ line }}</span>
              }
            </address>
            <a class="fb" [href]="contact.facebook" target="_blank" rel="noopener">
              <rc-icon name="facebook" /> {{ t().contact.facebook }}
              <span class="sr-only">({{ t().common.newTab }})</span>
            </a>
          </div>

          <nav class="cols" [attr.aria-label]="t().footer.explore">
            <div>
              <h2>{{ t().footer.stay }}</h2>
              <ul>
                <li>
                  <a [routerLink]="links.to('accommodation')">{{ t().footer.apartments }}</a>
                </li>
                <li>
                  <a [routerLink]="links.to('commonRoom')">{{ t().nav.commonRoom }}</a>
                </li>
                <li>
                  <a [routerLink]="links.to('facilities')">{{ t().nav.facilities }}</a>
                </li>
                <li>
                  <a [routerLink]="links.to('wellness')">{{ t().nav.wellness }}</a>
                </li>
                <li>
                  <a [routerLink]="links.to('availability')">{{ t().nav.availability }}</a>
                </li>
                <li>
                  <a [routerLink]="links.to('booking')">{{ t().nav.book }}</a>
                </li>
              </ul>
            </div>
            <div>
              <h2>{{ t().footer.explore }}</h2>
              <ul>
                <li>
                  <a [routerLink]="links.to('leisure')">{{ t().nav.leisure }}</a>
                </li>
                <li>
                  <a [routerLink]="links.to('gallery')">{{ t().nav.gallery }}</a>
                </li>
                <li>
                  <a [routerLink]="links.to('news')">{{ t().nav.news }}</a>
                </li>
                <li>
                  <a [routerLink]="links.to('contact')">{{ t().nav.contact }}</a>
                </li>
                <li>
                  <a [routerLink]="links.to('privacy')">{{ t().nav.privacy }}</a>
                </li>
              </ul>
            </div>
          </nav>
        </div>

        <div class="legal">
          <span>© {{ year }} {{ t().footer.rights }}</span>
          <span class="legal-links">
            <button
              type="button"
              id="open-cookie-settings"
              (click)="consent.settingsOpen.set(true)"
            >
              {{ t().cookies.footerLink }}
            </button>
            <a routerLink="/admin">{{ t().footer.admin }}</a>
          </span>
        </div>
      </div>
    </footer>
  `,
  styleUrl: './shell.scss',
})
export class SiteShell {
  protected readonly i18n = inject(I18n);
  protected readonly links = inject(Links);
  protected readonly consent = inject(Consent);
  protected readonly t = this.i18n.t;
  protected readonly contact = CONTACT;
  protected readonly year = new Date().getFullYear();
  protected readonly langs: { code: Lang; short: string; name: string }[] = [
    { code: 'cs', short: 'CS', name: 'Česky' },
    { code: 'en', short: 'EN', name: 'English' },
  ];

  protected readonly menuOpen = signal(false);
  protected readonly scrolled = signal(false);

  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly seo = inject(Seo);
  /** Page key and params of the active child route, used to link to the same page in the other language. */
  private readonly current = signal<{ page: PageKey; params: Record<string, string> }>({
    page: 'home',
    params: {},
  });

  protected readonly nav = computed(() => {
    const n = this.t().nav;
    return [
      { page: 'accommodation' as const, label: n.accommodation },
      { page: 'leisure' as const, label: n.leisure },
      { page: 'gallery' as const, label: n.gallery },
      { page: 'availability' as const, label: n.availability },
      { page: 'contact' as const, label: n.contact },
    ];
  });

  protected readonly otherUrl = computed(() => {
    const { page, params } = this.current();
    const build = (lang: Lang) => {
      const p = { ...params };
      const number = apartmentNumber(p['slug']);
      if (page === 'apartment' && number) p['slug'] = apartmentSlug(number, lang);
      return this.links.to(page, p, lang);
    };
    return { cs: build('cs'), en: build('en') };
  });

  constructor() {
    const read = () => {
      let r = this.route.snapshot;
      while (r.firstChild) r = r.firstChild;
      this.current.set({
        page: (r.data['page'] as PageKey) ?? 'home',
        params: r.params as Record<string, string>,
      });
    };
    read();
    let initial = !this.router.navigated;
    let lastPath = this.router.url.split(/[?#]/)[0];
    this.router.events
      .pipe(
        filter((e) => e instanceof NavigationEnd),
        takeUntilDestroyed(inject(DestroyRef)),
      )
      .subscribe(() => {
        read();
        this.menuOpen.set(false);
        // Tell keyboard and screen-reader users that a new page is shown: move focus to its start.
        // Not on first load, not for in-page anchors and not when only the query changed.
        const tree = this.router.parseUrl(this.router.url);
        const path = this.router.url.split(/[?#]/)[0];
        if (initial) initial = false;
        else if (path !== lastPath && !tree.fragment)
          document.getElementById('main')?.focus({ preventScroll: true });
        lastPath = path;
      });

    effect(() => {
      const urls = this.otherUrl();
      this.seo.alternates({
        cs: urls.cs.join('/').replace('//', '/'),
        en: urls.en.join('/').replace('//', '/'),
      });
    });
    effect(() => {
      document.body.style.overflow = this.menuOpen() ? 'hidden' : '';
    });
  }

  protected onScroll(): void {
    const scrolled = window.scrollY > 8;
    if (scrolled !== this.scrolled()) this.scrolled.set(scrolled);
  }

  /** Moves focus to the main content without changing the URL fragment. */
  protected skip(event: Event): void {
    event.preventDefault();
    document.getElementById('main')?.focus();
  }
}
