import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  inject,
  input,
  output,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { type BookingReceipt } from '@models/api.model';
import { I18nService } from '@services/i18n.service';
import { LinksService } from '@services/links.service';

@Component({
  selector: 'rc-booking-receipt',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  templateUrl: './booking-receipt.component.html',
  styleUrl: './booking-receipt.component.scss',
})
export class BookingReceiptComponent {
  /** What the API stored: code, dates and the price estimate. */
  readonly receipt = input.required<BookingReceipt>();
  /** Address the confirmation was sent to. */
  readonly email = input.required<string>();
  /** The visitor wants to send another request. */
  readonly again = output<void>();

  protected readonly i18n = inject(I18nService);
  protected readonly t = this.i18n.t;
  protected readonly links = inject(LinksService);

  constructor() {
    const host = inject<ElementRef<HTMLElement>>(ElementRef);
    afterNextRender(() => {
      window.scrollTo({ top: 0 });
      host.nativeElement.querySelector<HTMLElement>('.done')?.focus();
    });
  }
}
