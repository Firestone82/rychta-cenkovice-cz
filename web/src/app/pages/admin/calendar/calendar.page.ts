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
import {
  YEAR_LAYOUTS,
  type YearLayout,
  YearOccupancyComponent,
} from '@components/admin/year-occupancy/year-occupancy.component';
import { IconComponent } from '@components/icon/icon.component';
import { SkeletonComponent } from '@components/admin/skeleton/skeleton.component';
import type { Apartment, Booking } from '@models/api.model';
import { AdminApiService } from '@services/admin-api.service';
import { AuthService } from '@services/auth.service';
import { I18nService } from '@services/i18n.service';
import { SeoService } from '@services/seo.service';
import { addDays, addMonths, daysInMonth, startOfMonth, todayISO } from '@utils/dates.util';
import { readStored, writeStored } from '@utils/storage.util';

const VIEWS = ['months', 'year'] as const;
type CalendarView = (typeof VIEWS)[number];
const VIEW_KEY = 'rc_admin_calendar_view';
const LAYOUT_KEY = 'rc_admin_year_layout';

@Component({
  selector: 'rc-admin-calendar-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    IconComponent,
    SkeletonComponent,
    MonthSwitchComponent,
    BookingTimelineComponent,
    YearOccupancyComponent,
  ],
  templateUrl: './calendar.page.html',
  styleUrl: './calendar.page.scss',
})
export class CalendarPage {
  protected readonly t = inject(I18nService).t;
  protected readonly canEdit = inject(AuthService).canEdit;
  protected readonly views = VIEWS;
  protected readonly view = signal<CalendarView>(
    readStored<CalendarView>(VIEW_KEY, 'months') === 'year' ? 'year' : 'months',
  );
  protected readonly layouts = YEAR_LAYOUTS;
  protected readonly layout = signal<YearLayout>(
    readStored<YearLayout>(LAYOUT_KEY, 'boxes') === 'rows' ? 'rows' : 'boxes',
  );
  protected readonly month = signal(startOfMonth(todayISO()));
  protected readonly year = computed(() => Number(this.month().slice(0, 4)));
  /**
   * The chosen month and the one after it. The month running today stands alone
   * until it is past its half, when the next one starts to matter.
   */
  protected readonly months = computed(() => {
    const month = this.month();
    const today = todayISO();
    const early = month === startOfMonth(today) && Number(today.slice(8)) * 2 <= daysInMonth(month);
    return early ? [month] : [month, addMonths(month, 1)];
  });
  protected readonly apartments = signal<Apartment[]>([]);
  protected readonly bookings = signal<Booking[]>([]);
  protected readonly loading = signal(true);
  protected readonly failed = signal(false);

  private readonly api = inject(AdminApiService);
  /** One day either side, so stays crossing the edges of what is shown are included. */
  private readonly range = computed(
    () => {
      const first = this.view() === 'year' ? `${this.year()}-01-01` : this.month();
      const months = this.view() === 'year' ? 12 : 2;
      return { from: addDays(first, -1), to: addDays(addMonths(first, months), 1) };
    },
    { equal: (a, b) => a.from === b.from && a.to === b.to },
  );

  constructor() {
    inject(SeoService).noIndex(this.t().admin.calendar.title);
    this.api.apartments().then(
      (list) => this.apartments.set(list),
      () => this.failed.set(true),
    );
    effect(() => {
      const range = this.range();
      this.loading.set(true);
      this.api.bookings({ status: 'active', ...range }).then(
        (list) => {
          if (this.range() !== range) return;
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

  protected show(view: CalendarView): void {
    this.view.set(view);
    writeStored(VIEW_KEY, view);
  }

  protected arrange(layout: YearLayout): void {
    this.layout.set(layout);
    writeStored(LAYOUT_KEY, layout);
  }

  protected openMonth(first: string): void {
    this.month.set(first);
    this.show('months');
  }
}
