import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApartmentLabelsComponent } from '@components/apartment-labels/apartment-labels.component';
import { IconComponent } from '@components/icon/icon.component';
import { PicComponent } from '@components/pic/pic.component';
import type { Apartment } from '@models/api.model';
import { I18nService } from '@services/i18n.service';
import { LinksService } from '@services/links.service';

@Component({
  selector: 'rc-house-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, PicComponent, IconComponent, ApartmentLabelsComponent],
  templateUrl: './house-panel.component.html',
  styleUrl: './house-panel.component.scss',
})
export class HousePanelComponent {
  /** Apartment selected in the diagram. */
  readonly apartment = input.required<Apartment>();

  protected readonly i18n = inject(I18nService);
  protected readonly links = inject(LinksService);
  protected readonly t = this.i18n.t;
}
