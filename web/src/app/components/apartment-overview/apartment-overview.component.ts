import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import type { Apartment } from '@models/api.model';
import { I18nService } from '@services/i18n.service';
import { ApartmentTableComponent } from './apartment-table/apartment-table.component';

@Component({
  selector: 'rc-apartment-overview',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ApartmentTableComponent],
  templateUrl: './apartment-overview.component.html',
  styleUrl: './apartment-overview.component.scss',
})
export class ApartmentOverviewComponent {
  /** Apartments for the comparison table. */
  readonly apartments = input.required<Apartment[]>();

  protected readonly t = inject(I18nService).t;
}
