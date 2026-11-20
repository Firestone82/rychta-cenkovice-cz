import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  inject,
  signal,
} from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { Api } from '../core/api';
import { Auth } from '../core/auth';
import { I18n } from '../core/i18n/i18n';
import type { Lang } from '../core/i18n/types';
import { Icon, IconName } from '../ui/icon';
import { Logo } from '../ui/logo';

/** Frame of the administration: navigation on the side, the page next to it. */
@Component({
  selector: 'rc-admin-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Icon, Logo],
  host: { class: 'a-shell', '(document:keydown.escape)': 'open.set(false)' },
  template: `
    <a class="a-skip" href="#admin-main" (click)="skip($event)">{{ t().common.skip }}</a>

    <header class="a-top">
      <a class="a-brand" routerLink="/admin" [attr.aria-label]="t().admin.title">
        <rc-logo [markOnly]="true" />
        <span>{{ t().admin.title }}</span>
      </a>
      <button
        type="button"
        class="a-toggle"
        [attr.aria-expanded]="open()"
        aria-controls="admin-nav"
        (click)="open.set(!open())"
      >
        <rc-icon [name]="open() ? 'close' : 'menu'" /> {{ t().common.menu }}
      </button>
    </header>

    <nav id="admin-nav" class="a-side" [class.is-open]="open()" [attr.aria-label]="t().admin.title">
      <a class="a-brand a-brand-side" routerLink="/admin">
        <rc-logo [markOnly]="true" />
        <span>{{ t().admin.title }}</span>
      </a>
      <ul class="a-nav">
        @for (item of items; track item.path) {
          <li>
            <a
              [routerLink]="item.path"
              routerLinkActive="is-active"
              [routerLinkActiveOptions]="{ exact: item.path === '/admin' }"
              ariaCurrentWhenActive="page"
            >
              <rc-icon [name]="item.icon" />
              <span>{{ t().admin.nav[item.key] }}</span>
              @if (item.key === 'bookings' && pending()) {
                <span class="a-badge">{{ pending() }}</span>
              }
              @if (item.key === 'messages' && unread()) {
                <span class="a-badge">{{ unread() }}</span>
              }
            </a>
          </li>
        }
      </ul>
      <div class="a-side-foot">
        <p class="a-user">{{ auth.user()?.email }}</p>
        <a class="a-foot-link a-foot-site" [routerLink]="['/', i18n.lang()]"
          ><rc-icon name="home" /> {{ t().admin.nav.site }}</a
        >
        <button type="button" class="a-foot-link" (click)="logout()">
          <rc-icon name="logout" /> {{ t().admin.nav.logout }}
        </button>
        <div class="a-langs" role="group" [attr.aria-label]="t().common.language">
          @for (l of langs; track l) {
            <button type="button" [attr.aria-pressed]="i18n.lang() === l" (click)="i18n.use(l)">
              {{ l.toUpperCase() }}
            </button>
          }
        </div>
      </div>
    </nav>

    <main id="admin-main" class="a-main" tabindex="-1">
      <router-outlet />
    </main>
  `,
  styleUrl: './admin.scss',
})
export class AdminShell {
  protected readonly i18n = inject(I18n);
  protected readonly auth = inject(Auth);
  protected readonly t = this.i18n.t;
  private readonly api = inject(Api);
  private readonly router = inject(Router);

  protected readonly open = signal(false);
  protected readonly pending = signal(0);
  protected readonly unread = signal(0);
  protected readonly langs: Lang[] = ['cs', 'en'];

  protected readonly items: {
    path: string;
    key:
      | 'dashboard'
      | 'calendar'
      | 'bookings'
      | 'messages'
      | 'apartments'
      | 'photos'
      | 'news'
      | 'account';
    icon: IconName;
  }[] = [
    { path: '/admin', key: 'dashboard', icon: 'grid' },
    { path: '/admin/calendar', key: 'calendar', icon: 'calendar' },
    { path: '/admin/bookings', key: 'bookings', icon: 'bed' },
    { path: '/admin/messages', key: 'messages', icon: 'inbox' },
    { path: '/admin/apartments', key: 'apartments', icon: 'key' },
    { path: '/admin/photos', key: 'photos', icon: 'image' },
    { path: '/admin/news', key: 'news', icon: 'news' },
    { path: '/admin/account', key: 'account', icon: 'users' },
  ];

  constructor() {
    this.count();
    this.router.events
      .pipe(
        filter((e) => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        this.open.set(false);
        this.count();
      });
  }

  /** Refreshes the little counters next to Bookings and Messages. */
  private count(): void {
    this.api.dashboard().then(
      ({ dashboard }) => {
        this.pending.set(dashboard.pending_bookings);
        this.unread.set(dashboard.new_messages);
      },
      () => undefined,
    );
  }

  protected async logout(): Promise<void> {
    await this.auth.logout();
    await this.router.navigate(['/admin/login']);
  }

  protected skip(event: Event): void {
    event.preventDefault();
    document.getElementById('admin-main')?.focus();
  }
}
