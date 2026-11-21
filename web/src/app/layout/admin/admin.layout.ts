import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ViewEncapsulation,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { ConfirmOutletComponent } from '@components/admin/confirm-outlet/confirm-outlet.component';
import { AdminApiService } from '@services/admin-api.service';
import { AdminThemeService } from '@services/admin-theme.service';
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
  imports: [RouterOutlet, AdminTopbarComponent, AdminSidebarComponent, ConfirmOutletComponent],
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
    // Counts once now and again after every change to a booking or a message.
    effect(() => {
      this.api.changed();
      untracked(() => this.count());
    });
    this.applyTheme();
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

  /** The theme sits on the root element, so windows and toasts outside the shell follow it too. */
  private applyTheme(): void {
    const root = inject(DOCUMENT).documentElement;
    const theme = inject(AdminThemeService).theme;
    effect(() => root.setAttribute('data-admin-theme', theme()));
    inject(DestroyRef).onDestroy(() => root.removeAttribute('data-admin-theme'));
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
