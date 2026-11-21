import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { IconComponent } from '@components/icon/icon.component';
import type { Apartment } from '@models/api.model';
import { I18nService } from '@services/i18n.service';

@Component({
  selector: 'rc-apartment-summary',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  templateUrl: './apartment-summary.component.html',
  styleUrl: './apartment-summary.component.scss',
})
export class ApartmentSummaryComponent {
  /** Apartment shown as one line: number, name, size, badges for its state and type, and price. */
  readonly apartment = input.required<Apartment>();
  /** Its portal calendar could not be read; shown as a warning badge. */
  readonly calendarFailed = input(false);

  protected readonly i18n = inject(I18nService);
  protected readonly t = this.i18n.t;
}
