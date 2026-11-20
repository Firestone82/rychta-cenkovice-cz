import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import type { Apartment } from '@models/api.model';
import { I18nService } from '@services/i18n.service';

@Component({
  selector: 'rc-apartment-summary',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './apartment-summary.component.html',
  styleUrl: './apartment-summary.component.scss',
})
export class ApartmentSummaryComponent {
  /** Apartment shown as one line: number, size, visibility and price. */
  readonly apartment = input.required<Apartment>();

  protected readonly i18n = inject(I18nService);
  protected readonly t = this.i18n.t;
}
