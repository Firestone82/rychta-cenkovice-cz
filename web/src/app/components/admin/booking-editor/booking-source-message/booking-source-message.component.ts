import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import type { Message } from '@models/api.model';
import { I18nService } from '@services/i18n.service';

@Component({
  selector: 'rc-booking-source-message',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './booking-source-message.component.html',
  styleUrl: './booking-source-message.component.scss',
})
export class BookingSourceMessageComponent {
  /** Contact-form message the booking is being created from. */
  readonly message = input.required<Message>();

  protected readonly i18n = inject(I18nService);
  protected readonly t = this.i18n.t;
}
