import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { IconComponent } from '@components/icon/icon.component';
import type { Booking } from '@models/api.model';
import { I18nService } from '@services/i18n.service';
import { statusClass } from '@utils/booking.util';
import { BusyDirective } from '@directives/busy.directive';

/**
 * One table row; used as an attribute on `<tr>` so the table markup stays valid. A click anywhere
 * in the row opens the booking; the link on the name does the same for the keyboard.
 */
@Component({
  selector: 'tr[rcBookingRow]',
  host: { '(click)': 'open($event)' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BusyDirective, RouterLink, IconComponent],
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
  private readonly router = inject(Router);

  /** Links and buttons of the row keep their own job, and selecting text does not navigate. */
  protected open(event: MouseEvent): void {
    if ((event.target as Element).closest('a, button') || getSelection()?.toString()) return;
    void this.router.navigate(['/admin/bookings', this.booking().id]);
  }
}
