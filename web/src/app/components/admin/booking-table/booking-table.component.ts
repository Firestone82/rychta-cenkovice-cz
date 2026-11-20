import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import type { Apartment, Booking } from '@models/api.model';
import { I18nService } from '@services/i18n.service';
import { unitNumbers } from '@utils/booking.util';
import { BookingRowComponent } from './booking-row/booking-row.component';

export interface BookingDecision {
  booking: Booking;
  status: 'confirmed' | 'cancelled';
}

@Component({
  selector: 'rc-booking-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BookingRowComponent],
  templateUrl: './booking-table.component.html',
  styleUrl: './booking-table.component.scss',
})
export class BookingTableComponent {
  /** Bookings to list, one row each, in the given order. */
  readonly bookings = input.required<Booking[]>();
  /** Used to show apartment numbers instead of ids. */
  readonly apartments = input.required<Apartment[]>();
  /** Id of the booking whose decision is being saved; its buttons are disabled. */
  readonly busyId = input<number | null>(null);
  /** The owner confirmed or declined a pending request. */
  readonly decide = output<BookingDecision>();

  protected readonly t = inject(I18nService).t;

  protected units(b: Booking): string {
    return unitNumbers(b, this.apartments());
  }
}
