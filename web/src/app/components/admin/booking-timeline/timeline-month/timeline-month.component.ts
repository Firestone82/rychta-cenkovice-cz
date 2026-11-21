import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import type { Apartment, Booking } from '@models/api.model';
import { I18nService } from '@services/i18n.service';
import { monthBars, monthDays } from '@utils/timeline.util';
import { TimelineHeadComponent } from '../timeline-head/timeline-head.component';
import { TimelineRowComponent } from '../timeline-row/timeline-row.component';

@Component({
  selector: 'rc-timeline-month',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TimelineHeadComponent, TimelineRowComponent],
  templateUrl: './timeline-month.component.html',
  styleUrl: './timeline-month.component.scss',
})
export class TimelineMonthComponent {
  /** First day of the month as an ISO date. */
  readonly month = input.required<string>();
  /** One row per apartment. */
  readonly apartments = input.required<Apartment[]>();
  /** Active bookings; those outside the month are ignored. */
  readonly bookings = input.required<Booking[]>();
  /** ISO date marked as today. */
  readonly today = input.required<string>();

  protected readonly i18n = inject(I18nService);
  protected readonly days = computed(() => monthDays(this.month(), this.i18n.locale()));
  protected readonly rows = computed(() =>
    this.apartments().map((apartment) => ({
      apartment,
      bars: monthBars(this.bookings(), apartment.id, this.month()),
    })),
  );
}
