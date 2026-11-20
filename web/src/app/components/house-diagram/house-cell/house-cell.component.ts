import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import type { Apartment } from '@models/api.model';
import { I18nService } from '@services/i18n.service';

/** Content of one apartment cell of the house diagram; the host button is styled by the diagram. */
@Component({
  selector: 'button[rcHouseCell]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './house-cell.component.html',
  styleUrl: './house-cell.component.scss',
})
export class HouseCellComponent {
  /** Apartment whose number and area the cell shows. */
  readonly apartment = input.required<Apartment>();

  protected readonly i18n = inject(I18nService);
  protected readonly t = this.i18n.t;
}
