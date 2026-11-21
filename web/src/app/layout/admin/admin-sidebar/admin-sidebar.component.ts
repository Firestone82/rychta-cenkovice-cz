import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { type IconName, IconComponent } from '@components/icon/icon.component';
import { LogoComponent } from '@components/logo/logo.component';
import { AuthService } from '@services/auth.service';
import { I18nService } from '@services/i18n.service';
import { SidebarAccountComponent } from './sidebar-account/sidebar-account.component';
import { SidebarToolsComponent } from './sidebar-tools/sidebar-tools.component';

type NavKey =
  | 'dashboard'
  | 'calendar'
  | 'bookings'
  | 'messages'
  | 'apartments'
  | 'photos'
  | 'channels'
  | 'users'
  | 'account';

interface NavItem {
  path: string;
  key: NavKey;
  icon: IconName;
  /** Who sees the item besides administrators: nobody (`admin`) or staff; everyone without it. */
  only?: 'admin' | 'staff';
}

const ITEMS: NavItem[] = [
  { path: '/admin', key: 'dashboard', icon: 'grid', only: 'staff' },
  { path: '/admin/calendar', key: 'calendar', icon: 'calendar' },
  { path: '/admin/bookings', key: 'bookings', icon: 'bed' },
  { path: '/admin/messages', key: 'messages', icon: 'inbox', only: 'staff' },
  { path: '/admin/apartments', key: 'apartments', icon: 'key', only: 'admin' },
  { path: '/admin/photos', key: 'photos', icon: 'image', only: 'admin' },
  { path: '/admin/channels', key: 'channels', icon: 'sync', only: 'admin' },
  { path: '/admin/users', key: 'users', icon: 'users', only: 'admin' },
  { path: '/admin/account', key: 'account', icon: 'user' },
];

@Component({
  selector: 'rc-admin-sidebar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    RouterLinkActive,
    IconComponent,
    LogoComponent,
    SidebarToolsComponent,
    SidebarAccountComponent,
  ],
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

  protected readonly t = inject(I18nService).t;
  protected readonly items = computed(() =>
    ITEMS.filter(
      ({ only }) => !only || (only === 'admin' ? this.auth.isAdmin() : this.auth.canEdit()),
    ),
  );

  private readonly auth = inject(AuthService);
}
