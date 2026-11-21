import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { Apartment } from '@models/api.model';
import { I18nService } from '@services/i18n.service';
import { LinksService } from '@services/links.service';
import { roomCount } from '@utils/apartment.util';

@Component({
  selector: 'rc-apartment-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  templateUrl: './apartment-table.component.html',
  styleUrl: './apartment-table.component.scss',
})
export class ApartmentTableComponent {
  /** One row per apartment. */
  readonly apartments = input.required<Apartment[]>();

  protected readonly i18n = inject(I18nService);
  protected readonly links = inject(LinksService);
  protected readonly t = this.i18n.t;
  protected readonly roomCount = roomCount;
}
