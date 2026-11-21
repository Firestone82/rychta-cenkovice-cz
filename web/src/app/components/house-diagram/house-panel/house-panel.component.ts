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
  host: { '[class.active]': 'active()', '[attr.inert]': 'active() ? null : ""' },
})
export class HousePanelComponent {
  /** Apartment described by this panel. */
  readonly apartment = input.required<Apartment>();
  /** Whether this is the apartment selected in the diagram; the other panels only hold the space. */
  readonly active = input(false);

  protected readonly i18n = inject(I18nService);
  protected readonly links = inject(LinksService);
  protected readonly t = this.i18n.t;
}
