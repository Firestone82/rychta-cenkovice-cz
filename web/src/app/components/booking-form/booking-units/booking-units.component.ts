import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SpinnerComponent } from '@components/spinner/spinner.component';
import { I18nService } from '@services/i18n.service';
import { LinksService } from '@services/links.service';
import { BookingFormStore } from '../booking-form.store';
import { BookingStepComponent } from '../booking-step/booking-step.component';
import { UnitOptionComponent } from './unit-option/unit-option.component';

@Component({
  selector: 'rc-booking-units',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, SpinnerComponent, BookingStepComponent, UnitOptionComponent],
  templateUrl: './booking-units.component.html',
  styleUrl: './booking-units.component.scss',
})
export class BookingUnitsComponent {
  protected readonly store = inject(BookingFormStore);
  protected readonly i18n = inject(I18nService);
  protected readonly t = this.i18n.t;
  protected readonly links = inject(LinksService);
}
