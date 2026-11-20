import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BookingFormComponent } from '@components/booking-form/booking-form.component';
import { BookingFormStore } from '@components/booking-form/booking-form.store';
import { BookingReceiptComponent } from '@components/booking-receipt/booking-receipt.component';
import { type BookingReceipt } from '@models/api.model';
import { I18nService } from '@services/i18n.service';
import { SeoService } from '@services/seo.service';

@Component({
  selector: 'rc-booking',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BookingFormComponent, BookingReceiptComponent],
  providers: [BookingFormStore],
  templateUrl: './booking.page.html',
  styleUrl: './booking.page.scss',
})
export class BookingPage {
  protected readonly t = inject(I18nService).t;
  protected readonly store = inject(BookingFormStore);
  protected readonly receipt = signal<BookingReceipt | null>(null);

  constructor() {
    inject(SeoService).page(this.t().booking.title, this.t().booking.lead);
    this.store.init(inject(ActivatedRoute).snapshot.queryParamMap);
  }

  protected again(): void {
    this.store.startOver();
    this.receipt.set(null);
  }
}
