import { ChangeDetectionStrategy, Component, inject, model } from '@angular/core';
import { AMENITIES, type Amenity } from '@models/apartment-options.model';
import { I18nService } from '@services/i18n.service';
import { checkedOf } from '@utils/forms.util';

@Component({
  selector: 'rc-apartment-amenities',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './apartment-amenities.component.html',
  styleUrl: './apartment-amenities.component.scss',
})
export class ApartmentAmenitiesComponent {
  /** Ticked equipment keys. */
  readonly selected = model.required<Amenity[]>();

  protected readonly t = inject(I18nService).t;
  protected readonly keys = AMENITIES;
  protected readonly checked = checkedOf;

  protected toggle(key: Amenity, on: boolean): void {
    this.selected.update((list) => (on ? [...list, key] : list.filter((k) => k !== key)));
  }
}
