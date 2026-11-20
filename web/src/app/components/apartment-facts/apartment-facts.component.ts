import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { I18nService } from '@services/i18n.service';
import type { Apartment } from '@models/api.model';
import { IconComponent } from '@components/icon/icon.component';

@Component({
  selector: 'rc-apartment-facts',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  templateUrl: './apartment-facts.component.html',
  styleUrl: './apartment-facts.component.scss',
})
export class ApartmentFactsComponent {
  protected readonly i18n = inject(I18nService);
  protected readonly t = this.i18n.t;
  /** Apartment whose area, beds, floor and access are listed. */
  readonly apartment = input.required<Apartment>();
}
