import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { type IconName, IconComponent } from '@components/icon/icon.component';
import { LogoComponent } from '@components/logo/logo.component';
import { SITE } from '@config/site.config';
import { AuthService } from '@services/auth.service';
import { I18nService } from '@services/i18n.service';

type NavKey =
  'dashboard' | 'calendar' | 'bookings' | 'messages' | 'apartments' | 'photos' | 'news' | 'account';

@Component({
  selector: 'rc-admin-sidebar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, IconComponent, LogoComponent],
  templateUrl: './admin-sidebar.component.html',
  styleUrl: './admin-sidebar.component.scss',
})
export class AdminSidebarComponent {
  /** Shows the navigation on narrow screens, where it is a drawer. */
  readonly open = input(false);
  /** Number of booking requests waiting for a decision; badge next to Bookings. */
  readonly pending = input(0);
  /** Number of unread messages; badge next to Messages. */
  readonly unread = input(0);

  protected readonly i18n = inject(I18nService);
  protected readonly auth = inject(AuthService);
  protected readonly t = this.i18n.t;
  protected readonly langs = SITE.languages.map((l) => l.code);
  protected readonly items: { path: string; key: NavKey; icon: IconName }[] = [
    { path: '/admin', key: 'dashboard', icon: 'grid' },
    { path: '/admin/calendar', key: 'calendar', icon: 'calendar' },
    { path: '/admin/bookings', key: 'bookings', icon: 'bed' },
    { path: '/admin/messages', key: 'messages', icon: 'inbox' },
    { path: '/admin/apartments', key: 'apartments', icon: 'key' },
    { path: '/admin/photos', key: 'photos', icon: 'image' },
    { path: '/admin/news', key: 'news', icon: 'news' },
    { path: '/admin/account', key: 'account', icon: 'users' },
  ];

  private readonly router = inject(Router);

  protected async logout(): Promise<void> {
    await this.auth.logout();
    await this.router.navigate(['/admin/login']);
  }
}
