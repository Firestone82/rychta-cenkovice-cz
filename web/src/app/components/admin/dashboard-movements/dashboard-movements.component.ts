import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { Apartment, Booking } from '@models/api.model';
import { I18nService } from '@services/i18n.service';
import { unitNumbers } from '@utils/booking.util';

@Component({
  selector: 'rc-dashboard-movements',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  templateUrl: './dashboard-movements.component.html',
  styleUrl: './dashboard-movements.component.scss',
})
export class DashboardMovementsComponent {
  /** `arrivals` lists check-ins with guest counts, `departures` lists check-outs. */
  readonly kind = input.required<'arrivals' | 'departures'>();
  /** Upcoming bookings of that kind, soonest first. */
  readonly bookings = input.required<Booking[]>();
  /** Used to show apartment numbers instead of ids. */
  readonly apartments = input.required<Apartment[]>();

  protected readonly i18n = inject(I18nService);
  protected readonly t = this.i18n.t;

  protected detail(b: Booking): string {
    const units = `${this.t().common.apartment} ${unitNumbers(b, this.apartments())}`;
    return this.kind() === 'arrivals'
      ? `${units}, ${this.i18n.count(b.guests, this.t().plural.guests)}`
      : units;
  }
}
