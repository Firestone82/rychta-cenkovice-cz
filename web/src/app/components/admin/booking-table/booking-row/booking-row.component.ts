import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '@components/icon/icon.component';
import type { Booking } from '@models/api.model';
import { I18nService } from '@services/i18n.service';
import { statusClass } from '@utils/booking.util';

/** One table row; used as an attribute on `<tr>` so the table markup stays valid. */
@Component({
  selector: 'tr[rcBookingRow]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent],
  templateUrl: './booking-row.component.html',
  styleUrl: './booking-row.component.scss',
})
export class BookingRowComponent {
  /** Booking shown in this row. */
  readonly booking = input.required<Booking>();
  /** Apartment numbers of the booking, e.g. "1, 3". */
  readonly units = input.required<string>();
  /** Disables the confirm and decline buttons. */
  readonly busy = input(false);
  /** Shows the link that opens the booking instead of the confirm and decline buttons. */
  readonly readOnly = input(false);
  /** The owner confirmed or declined this pending request. */
  readonly decide = output<'confirmed' | 'cancelled'>();

  protected readonly i18n = inject(I18nService);
  protected readonly t = this.i18n.t;
  protected readonly tagClass = statusClass;
}
