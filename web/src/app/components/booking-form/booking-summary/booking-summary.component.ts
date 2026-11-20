import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { I18nService } from '@services/i18n.service';
import { BookingFormStore } from '../booking-form.store';

@Component({
  selector: 'rc-booking-summary',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  templateUrl: './booking-summary.component.html',
  styleUrl: './booking-summary.component.scss',
})
export class BookingSummaryComponent {
  /** Why the request could not be sent; shown above the submit button. */
  readonly failure = input('');
  /** The request is on its way: the submit button is disabled. */
  readonly sending = input(false);

  protected readonly store = inject(BookingFormStore);
  protected readonly i18n = inject(I18nService);
  protected readonly t = this.i18n.t;
}
