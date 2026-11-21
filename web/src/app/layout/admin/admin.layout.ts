import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { ConfirmOutletComponent } from '@components/admin/confirm-outlet/confirm-outlet.component';
import { DemoNoticeComponent } from '@components/demo-notice/demo-notice.component';
import { AdminApiService } from '@services/admin-api.service';
import { AuthService } from '@services/auth.service';
import { I18nService } from '@services/i18n.service';
import { filter } from 'rxjs';
import { AdminSidebarComponent } from './admin-sidebar/admin-sidebar.component';
import { AdminTopbarComponent } from './admin-topbar/admin-topbar.component';

/**
 * Frame of the administration: navigation on the side, the page next to it. Its stylesheet is
 * not scoped: it also carries the shared `a-*` classes every admin page and component uses.
 */
@Component({
  selector: 'rc-admin-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [
    RouterOutlet,
    AdminTopbarComponent,
    AdminSidebarComponent,
    ConfirmOutletComponent,
    DemoNoticeComponent,
  ],
  host: { class: 'a-shell', '(document:keydown.escape)': 'open.set(false)' },
  templateUrl: './admin.layout.html',
  styleUrl: './admin.layout.scss',
})
export class AdminLayout {
  protected readonly t = inject(I18nService).t;
  protected readonly open = signal(false);
  protected readonly pending = signal(0);
  protected readonly unread = signal(0);

  private readonly api = inject(AdminApiService);
  private readonly auth = inject(AuthService);

  constructor() {
    // Counts once now and again after every change to a booking or a message.
    effect(() => {
      this.api.changed();
      untracked(() => this.count());
    });
    inject(Router)
      .events.pipe(
        filter((e) => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        this.open.set(false);
        this.count();
      });
  }

  protected skip(event: Event): void {
    event.preventDefault();
    document.getElementById('admin-main')?.focus();
  }

  /** Read-only accounts have no overview, so nothing is counted for them. */
  private count(): void {
    if (!this.auth.canEdit()) return;
    this.api.dashboard().then(
      ({ dashboard }) => {
        this.pending.set(dashboard.pending_bookings);
        this.unread.set(dashboard.new_messages);
      },
      () => undefined,
    );
  }
}
