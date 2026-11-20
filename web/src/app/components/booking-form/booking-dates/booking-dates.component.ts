import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { I18nService } from '@services/i18n.service';
import { valueOf } from '@utils/forms.util';
import { BookingFormStore } from '../booking-form.store';
import { BookingStepComponent } from '../booking-step/booking-step.component';

@Component({
  selector: 'rc-booking-dates',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BookingStepComponent],
  templateUrl: './booking-dates.component.html',
  styleUrl: './booking-dates.component.scss',
})
export class BookingDatesComponent {
  protected readonly store = inject(BookingFormStore);
  protected readonly i18n = inject(I18nService);
  protected readonly t = this.i18n.t;
  protected readonly value = valueOf;
}
