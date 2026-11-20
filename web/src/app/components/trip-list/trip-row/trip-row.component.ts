import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { IconComponent } from '@components/icon/icon.component';
import type { Trip } from '@models/i18n.model';
import { I18nService } from '@services/i18n.service';
import { bundled } from '@utils/images.util';

@Component({
  selector: 'rc-trip-row',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  templateUrl: './trip-row.component.html',
  styleUrl: './trip-row.component.scss',
})
export class TripRowComponent {
  /** The destination to show: distance, name, description, link and thumbnail. */
  readonly trip = input.required<Trip>();

  protected readonly i18n = inject(I18nService);
  protected readonly t = this.i18n.t;
  protected readonly image = computed(() => {
    const key = this.trip().img;
    return key ? bundled(`trip-${key}`) : null;
  });
}
