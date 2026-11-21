import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  type BookingFilter,
  BookingFiltersComponent,
} from '@components/admin/booking-filters/booking-filters.component';
import {
  type BookingDecision,
  BookingTableComponent,
} from '@components/admin/booking-table/booking-table.component';
import { IconComponent } from '@components/icon/icon.component';
import { SpinnerComponent } from '@components/spinner/spinner.component';
import type { Apartment, Booking } from '@models/api.model';
import { AdminApiService } from '@services/admin-api.service';
import { AuthService } from '@services/auth.service';
import { I18nService } from '@services/i18n.service';
import { SeoService } from '@services/seo.service';
import { ToastService } from '@services/toast.service';

@Component({
  selector: 'rc-admin-bookings-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    IconComponent,
    SpinnerComponent,
    BookingFiltersComponent,
    BookingTableComponent,
  ],
  templateUrl: './bookings.page.html',
  styleUrl: './bookings.page.scss',
})
export class BookingsPage {
  protected readonly t = inject(I18nService).t;
  protected readonly canEdit = inject(AuthService).canEdit;
  protected readonly filter = signal<BookingFilter>('active');
  protected readonly search = signal('');
  protected readonly items = signal<Booking[] | null>(null);
  protected readonly apartments = signal<Apartment[]>([]);
  protected readonly failed = signal(false);
  protected readonly busy = signal<number | null>(null);

  private readonly api = inject(AdminApiService);
  private readonly toasts = inject(ToastService);
  /** Sequence number of the latest list request; older answers are dropped. */
  private request = 0;

  constructor() {
    inject(SeoService).noIndex(this.t().admin.bookings.title);
    const status = inject(ActivatedRoute).snapshot.queryParamMap.get('status');
    if (status === 'pending' || status === 'confirmed' || status === 'cancelled')
      this.filter.set(status);
    this.api.apartments().then(
      (list) => this.apartments.set(list),
      () => undefined,
    );
    effect(() => {
      this.filter();
      this.search();
      untracked(() => this.load());
    });
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
    const request = ++this.request;
    this.api
      .bookings({
        status: this.filter(),
        q: this.search(),
        order: this.filter() === 'pending' ? 'created' : 'arrival',
      })
      .then(
        (list) => {
          if (request !== this.request) return;
          this.failed.set(false);
          this.items.set(list);
        },
        () => {
          if (request !== this.request) return;
          this.failed.set(true);
          this.items.set([]);
        },
      );
  }
}
