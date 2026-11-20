import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { ApiService } from '@services/api.service';
import { type BookingReceipt } from '@models/api.model';
import { toFailure } from '@utils/api-failure.util';
import { I18nService } from '@services/i18n.service';
import { captchaSpent, submitFailure } from '@utils/forms.util';
import { BookingContactComponent } from './booking-contact/booking-contact.component';
import { BookingDatesComponent } from './booking-dates/booking-dates.component';
import { BookingFormStore } from './booking-form.store';
import { BookingSummaryComponent } from './booking-summary/booking-summary.component';
import { BookingUnitsComponent } from './booking-units/booking-units.component';

/** Selector of the control to focus for the first invalid field. */
const FOCUS: Record<string, string> = {
  dates: '#b-in',
  apartment_ids: '#units input:not(:disabled)',
  guests: '#units input:not(:disabled)',
};

/**
 * Booking request in three steps. The state lives in BookingFormStore, which the page
 * provides so that it survives while the receipt is shown.
 */
@Component({
  selector: 'rc-booking-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    BookingDatesComponent,
    BookingUnitsComponent,
    BookingContactComponent,
    BookingSummaryComponent,
  ],
  templateUrl: './booking-form.component.html',
  styleUrl: './booking-form.component.scss',
})
export class BookingFormComponent {
  /** The API accepted the request. */
  readonly sent = output<BookingReceipt>();

  protected readonly failure = signal('');
  protected readonly sending = signal(false);

  private readonly store = inject(BookingFormStore);
  private readonly api = inject(ApiService);
  private readonly t = inject(I18nService).t;
  private readonly form = viewChild.required<ElementRef<HTMLFormElement>>('form');
  private readonly contact = viewChild.required(BookingContactComponent);

  protected async submit(event: Event): Promise<void> {
    event.preventDefault();
    if (this.sending()) return;
    if (this.show(this.store.validate(this.contact().captchaNeeded()))) return;

    this.sending.set(true);
    this.failure.set('');
    try {
      this.sent.emit(await this.api.requestBooking(this.store.request()));
    } catch (err) {
      const failure = toFailure(err);
      if (captchaSpent(failure)) this.contact().resetCaptcha();
      if (failure.status === 409) {
        this.store.markTaken(failure.apartmentIds);
        this.failure.set(this.t().booking.conflict);
        this.focus(FOCUS['apartment_ids']);
      } else if (failure.code === 'validation') {
        const fields: Record<string, string> = {};
        for (const [field, code] of Object.entries(failure.fields))
          fields[field === 'check_in' || field === 'check_out' ? 'dates' : field] = code;
        if (!this.show(fields)) this.failure.set(this.t().errors.generic);
      } else {
        this.failure.set(submitFailure(this.t(), failure));
      }
    } finally {
      this.sending.set(false);
    }
  }

  /** Shows the problems next to their fields and focuses the first one. Returns true when there are any. */
  private show(codes: Record<string, string>): boolean {
    this.store.showErrors(codes);
    const first = Object.keys(codes)[0];
    if (!first) return false;
    this.failure.set(this.t().booking.fixErrors);
    this.focus(FOCUS[first] ?? '[aria-invalid="true"], [data-invalid]');
    return true;
  }

  private focus(selector: string): void {
    setTimeout(() => this.form().nativeElement.querySelector<HTMLElement>(selector)?.focus());
  }
}
