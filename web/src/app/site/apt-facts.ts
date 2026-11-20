import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { I18n } from '../core/i18n/i18n';
import type { Apartment } from '../core/models';
import { Icon } from '../ui/icon';

/** Area, beds, floor and step-free access of one apartment, as a short icon list. */
@Component({
  selector: 'rc-apt-facts',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    <ul class="facts">
      <li><rc-icon name="area" /> {{ apartment().area }} {{ t().common.areaUnit }}</li>
      <li>
        <rc-icon name="bed" /> {{ i18n.count(apartment().beds, t().plural.beds) }}
        @if (apartment().extra_beds) {
          + {{ apartment().extra_beds }} {{ t().common.extraBeds }}
        }
      </li>
      <li><rc-icon name="stairs" /> {{ t().common.floor[apartment().floor - 1] }}</li>
      @if (apartment().accessible) {
        <li><rc-icon name="access" /> {{ t().common.stepFree }}</li>
      }
    </ul>
  `,
  styles: `
    :host {
      display: block;
    }
  `,
})
export class AptFacts {
  protected readonly i18n = inject(I18n);
  protected readonly t = this.i18n.t;
  readonly apartment = input.required<Apartment>();
}
