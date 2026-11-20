import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { BookingDecision } from '@components/admin/booking-table/booking-table.component';
import { DashboardMovementsComponent } from '@components/admin/dashboard-movements/dashboard-movements.component';
import { DashboardPendingComponent } from '@components/admin/dashboard-pending/dashboard-pending.component';
import { DashboardStatsComponent } from '@components/admin/dashboard-stats/dashboard-stats.component';
import { IconComponent } from '@components/icon/icon.component';
import { SpinnerComponent } from '@components/spinner/spinner.component';
import type { Apartment, Dashboard } from '@models/api.model';
import { AdminApiService } from '@services/admin-api.service';
import { I18nService } from '@services/i18n.service';
import { SeoService } from '@services/seo.service';
import { ToastService } from '@services/toast.service';

@Component({
  selector: 'rc-admin-dashboard-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    IconComponent,
    SpinnerComponent,
    DashboardStatsComponent,
    DashboardPendingComponent,
    DashboardMovementsComponent,
  ],
  templateUrl: './dashboard.page.html',
  styleUrl: './dashboard.page.scss',
})
export class DashboardPage {
  protected readonly i18n = inject(I18nService);
  protected readonly t = this.i18n.t;
  protected readonly data = signal<Dashboard | null>(null);
  /** The API's idea of today, so the heading matches the counters. */
  protected readonly today = signal('');
  protected readonly apartments = signal<Apartment[]>([]);
  protected readonly failed = signal(false);
  protected readonly busy = signal<number | null>(null);

  private readonly api = inject(AdminApiService);
  private readonly toasts = inject(ToastService);

  constructor() {
    inject(SeoService).noIndex(this.t().admin.dashboard.title);
    this.api.apartments().then(
      (list) => this.apartments.set(list),
      () => undefined,
    );
    this.load();
  }

  protected async decide({ booking, status }: BookingDecision): Promise<void> {
    this.busy.set(booking.id);
    try {
      await this.api.updateBooking(booking.id, { status, notify: true });
      this.toasts.show(this.t().admin.bookings.saved);
      this.load();
    } catch {
      this.toasts.show(this.t().admin.common.error, 'error');
    } finally {
      this.busy.set(null);
    }
  }

  private load(): void {
    this.api.dashboard().then(
      ({ today, dashboard }) => {
        this.today.set(today);
        this.data.set(dashboard);
      },
      () => this.failed.set(true),
    );
  }
}
