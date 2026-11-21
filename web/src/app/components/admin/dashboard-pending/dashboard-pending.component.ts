import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { BookingDecision } from '@components/admin/booking-table/booking-table.component';
import { IconComponent } from '@components/icon/icon.component';
import type { Apartment, Booking } from '@models/api.model';
import { I18nService } from '@services/i18n.service';
import { unitNumbers } from '@utils/booking.util';
import { BusyDirective } from '@directives/busy.directive';

@Component({
  selector: 'rc-dashboard-pending',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BusyDirective, RouterLink, IconComponent],
  templateUrl: './dashboard-pending.component.html',
  styleUrl: './dashboard-pending.component.scss',
})
export class DashboardPendingComponent {
  /** Booking requests waiting for a decision. */
  readonly bookings = input.required<Booking[]>();
  /** Used to show apartment numbers instead of ids. */
  readonly apartments = input.required<Apartment[]>();
  /** Id of the booking whose decision is being saved; its buttons are disabled. */
  readonly busyId = input<number | null>(null);
  /** The owner confirmed or declined a request. */
  readonly decide = output<BookingDecision>();

  protected readonly i18n = inject(I18nService);
  protected readonly t = this.i18n.t;

  protected units(b: Booking): string {
    return unitNumbers(b, this.apartments());
  }
}
