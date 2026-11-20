import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { Apartment } from '@models/api.model';
import { I18nService } from '@services/i18n.service';
import { LinksService } from '@services/links.service';

@Component({
  selector: 'rc-apartment-others',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  templateUrl: './apartment-others.component.html',
  styleUrl: './apartment-others.component.scss',
})
export class ApartmentOthersComponent {
  /** Apartments to link to; the section is left out when empty. */
  readonly apartments = input.required<Apartment[]>();

  protected readonly i18n = inject(I18nService);
  protected readonly links = inject(LinksService);
  protected readonly t = this.i18n.t;
}
