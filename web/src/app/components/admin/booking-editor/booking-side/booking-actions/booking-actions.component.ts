import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '@components/icon/icon.component';
import type { Booking, BookingStatus } from '@models/api.model';
import { I18nService } from '@services/i18n.service';
import { BusyDirective } from '@directives/busy.directive';

@Component({
  selector: 'rc-booking-actions',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BusyDirective, RouterLink, IconComponent],
  templateUrl: './booking-actions.component.html',
  styleUrl: './booking-actions.component.scss',
})
export class BookingActionsComponent {
  /** Stored booking; its status decides which actions are offered. */
  readonly booking = input.required<Booking>();
  /** Disables every button while a request is running. */
  readonly busy = input(false);
  /** The owner asked to move the booking to this status. */
  readonly status = output<BookingStatus>();
  /** The owner asked to delete the booking; not confirmed yet. */
  readonly remove = output<void>();

  protected readonly t = inject(I18nService).t;
}
