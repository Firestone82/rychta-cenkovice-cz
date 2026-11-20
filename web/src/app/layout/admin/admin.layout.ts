import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { AdminApiService } from '@services/admin-api.service';
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
  imports: [RouterOutlet, AdminTopbarComponent, AdminSidebarComponent],
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

  constructor() {
    this.count();
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

  private count(): void {
    this.api.dashboard().then(
      ({ dashboard }) => {
        this.pending.set(dashboard.pending_bookings);
        this.unread.set(dashboard.new_messages);
      },
      () => undefined,
    );
  }
}
