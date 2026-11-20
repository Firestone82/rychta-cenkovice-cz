import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { IconComponent } from '@components/icon/icon.component';
import { PhotoGridComponent } from '@components/photo-grid/photo-grid.component';
import type { Apartment, Photo } from '@models/api.model';
import { I18nService } from '@services/i18n.service';

@Component({
  selector: 'rc-apartment-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, PhotoGridComponent],
  templateUrl: './apartment-detail.component.html',
  styleUrl: './apartment-detail.component.scss',
})
export class ApartmentDetailComponent {
  /** Apartment whose equipment, rooms and note are listed. */
  readonly apartment = input.required<Apartment>();
  /** Photo grid under the lists; hidden with fewer than two photos. */
  readonly photos = input.required<Photo[]>();
  /** Index of the photo the visitor wants to see enlarged. */
  readonly openPhoto = output<number>();

  protected readonly i18n = inject(I18nService);
  protected readonly t = this.i18n.t;
}
