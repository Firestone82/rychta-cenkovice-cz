import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApartmentLabelsComponent } from '@components/apartment-labels/apartment-labels.component';
import { IconComponent } from '@components/icon/icon.component';
import type { Apartment } from '@models/api.model';
import { I18nService } from '@services/i18n.service';
import { LinksService } from '@services/links.service';

@Component({
  selector: 'rc-apartment-head',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent, ApartmentLabelsComponent],
  templateUrl: './apartment-head.component.html',
  styleUrl: './apartment-head.component.scss',
})
export class ApartmentHeadComponent {
  /** Apartment whose number, type and labels form the page heading. */
  readonly apartment = input.required<Apartment>();

  protected readonly i18n = inject(I18nService);
  protected readonly links = inject(LinksService);
  protected readonly t = this.i18n.t;
}
