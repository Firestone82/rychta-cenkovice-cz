import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { BookingTimelineComponent } from '@components/admin/booking-timeline/booking-timeline.component';
import { MonthSwitchComponent } from '@components/admin/month-switch/month-switch.component';
import { IconComponent } from '@components/icon/icon.component';
import { SpinnerComponent } from '@components/spinner/spinner.component';
import type { Apartment, Booking } from '@models/api.model';
import { AdminApiService } from '@services/admin-api.service';
import { I18nService } from '@services/i18n.service';
import { SeoService } from '@services/seo.service';
import { addDays, addMonths, startOfMonth, todayISO } from '@utils/dates.util';

@Component({
  selector: 'rc-admin-calendar-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    IconComponent,
    SpinnerComponent,
    MonthSwitchComponent,
    BookingTimelineComponent,
  ],
  templateUrl: './calendar.page.html',
  styleUrl: './calendar.page.scss',
})
export class CalendarPage {
  protected readonly t = inject(I18nService).t;
  protected readonly month = signal(startOfMonth(todayISO()));
  /** The chosen month between the one before and the one after. */
  protected readonly months = computed(() => [-1, 0, 1].map((by) => addMonths(this.month(), by)));
  protected readonly apartments = signal<Apartment[]>([]);
  protected readonly bookings = signal<Booking[]>([]);
  protected readonly loading = signal(true);
  protected readonly failed = signal(false);

  private readonly api = inject(AdminApiService);

  constructor() {
    inject(SeoService).noIndex(this.t().admin.calendar.title);
    this.api.apartments().then(
      (list) => this.apartments.set(list),
      () => this.failed.set(true),
    );
    effect(() => {
      const month = this.month();
      this.loading.set(true);
      // One day either side, so stays crossing the edges of the shown months are included.
      this.api
        .bookings({
          status: 'active',
          from: addDays(addMonths(month, -1), -1),
          to: addDays(addMonths(month, 2), 1),
        })
        .then(
          (list) => {
            if (this.month() !== month) return;
            this.bookings.set(list);
            this.loading.set(false);
          },
          () => {
            this.failed.set(true);
            this.loading.set(false);
          },
        );
    });
  }
}
