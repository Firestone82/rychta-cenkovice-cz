import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { Apartment, Booking } from '@models/api.model';
import { I18nService } from '@services/i18n.service';
import type { TimelineBar, TimelineDay } from '@utils/timeline.util';

@Component({
  selector: 'rc-timeline-row',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  templateUrl: './timeline-row.component.html',
  styleUrl: './timeline-row.component.scss',
})
export class TimelineRowComponent {
  /** Apartment this row belongs to. */
  readonly apartment = input.required<Apartment>();
  /** Bookings of this apartment as bars on the half-day grid. */
  readonly bars = input.required<TimelineBar[]>();
  /** Days of the shown month; each free day links to a new booking. */
  readonly days = input.required<TimelineDay[]>();
  /** ISO date marked as today. */
  readonly today = input.required<string>();

  protected readonly i18n = inject(I18nService);
  protected readonly t = this.i18n.t;

  protected label(b: Booking): string {
    const text = this.t().admin.bookings;
    const state = b.kind === 'block' ? text.kind.block : text.status[b.status];
    return `${this.i18n.range(b.check_in, b.check_out)}, ${state}`;
  }

  protected newLabel(iso: string): string {
    const unit = `${this.t().common.apartment} ${this.apartment().number}`;
    return `${this.t().admin.bookings.new}: ${unit}, ${this.i18n.date(iso)}`;
  }
}
