import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import type { Apartment, Booking } from '@models/api.model';
import { I18nService } from '@services/i18n.service';
import { todayISO } from '@utils/dates.util';
import { monthBars, monthDays } from '@utils/timeline.util';
import { TimelineHeadComponent } from './timeline-head/timeline-head.component';
import { TimelineLegendComponent } from './timeline-legend/timeline-legend.component';
import { TimelineRowComponent } from './timeline-row/timeline-row.component';

/**
 * A month as a timeline: one row per apartment, bookings as bars from the afternoon of
 * arrival to the morning of departure. Bars open the booking, free days start a new one.
 */
@Component({
  selector: 'rc-booking-timeline',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TimelineHeadComponent, TimelineRowComponent, TimelineLegendComponent],
  templateUrl: './booking-timeline.component.html',
  styleUrl: './booking-timeline.component.scss',
})
export class BookingTimelineComponent {
  /** First day of the shown month as an ISO date. */
  readonly month = input.required<string>();
  /** One row per apartment. */
  readonly apartments = input.required<Apartment[]>();
  /** Active bookings overlapping the month. */
  readonly bookings = input.required<Booking[]>();
  /** Dims the timeline while another month is being loaded. */
  readonly loading = input(false);

  protected readonly i18n = inject(I18nService);
  protected readonly t = this.i18n.t;
  protected readonly today = todayISO();
  protected readonly days = computed(() => monthDays(this.month(), this.i18n.locale()));
  protected readonly rows = computed(() =>
    this.apartments().map((apartment) => ({
      apartment,
      bars: monthBars(this.bookings(), apartment.id, this.month()),
    })),
  );
}
