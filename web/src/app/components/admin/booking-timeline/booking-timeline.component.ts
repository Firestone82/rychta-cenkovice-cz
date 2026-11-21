import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import type { Apartment, Booking } from '@models/api.model';
import { todayISO } from '@utils/dates.util';
import { TimelineLegendComponent } from './timeline-legend/timeline-legend.component';
import { TimelineMonthComponent } from './timeline-month/timeline-month.component';
import { TimelineSelectionStore } from './timeline-selection.store';

/**
 * Months as timelines: one row per apartment, bookings as bars from the afternoon of
 * arrival to the morning of departure. Bars open the booking, a free day starts a new one,
 * and dragging over several days starts a new one for that stay, also across months.
 */
@Component({
  selector: 'rc-booking-timeline',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TimelineMonthComponent, TimelineLegendComponent],
  providers: [TimelineSelectionStore],
  templateUrl: './booking-timeline.component.html',
  styleUrl: './booking-timeline.component.scss',
  host: {
    '(document:pointerup)': 'finish()',
    '(document:pointercancel)': 'cancel()',
    '(document:keydown.escape)': 'cancel()',
  },
})
export class BookingTimelineComponent {
  /** First days of the shown months as ISO dates, in the order they are stacked. */
  readonly months = input.required<string[]>();
  /** One row per apartment in every month. */
  readonly apartments = input.required<Apartment[]>();
  /** Active bookings overlapping the months. */
  readonly bookings = input.required<Booking[]>();
  /** Dims the timelines while other months are being loaded. */
  readonly loading = input(false);

  protected readonly today = todayISO();
  private readonly picking = inject(TimelineSelectionStore);
  private readonly router = inject(Router);

  /** A drag that stayed on one day is left to the link of that day. */
  protected finish(): void {
    const picked = this.picking.finish();
    if (!picked || picked.from === picked.to) return;
    void this.router.navigate(['/admin/bookings/new'], {
      queryParams: { from: picked.from, to: picked.to, a: picked.apartment.number },
    });
  }

  protected cancel(): void {
    this.picking.finish();
  }
}
