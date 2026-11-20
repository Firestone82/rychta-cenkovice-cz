import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { HouseDiagramComponent } from '@components/house-diagram/house-diagram.component';
import { SpinnerComponent } from '@components/spinner/spinner.component';
import type { Apartment } from '@models/api.model';
import { ApiService } from '@services/api.service';
import { I18nService } from '@services/i18n.service';

@Component({
  selector: 'rc-home-house',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HouseDiagramComponent, SpinnerComponent],
  templateUrl: './home-house.component.html',
  styleUrl: './home-house.component.scss',
})
export class HomeHouseComponent {
  protected readonly t = inject(I18nService).t;
  /** null while loading, empty when the API could not be reached. */
  protected readonly apartments = signal<Apartment[] | null>(null);

  constructor() {
    inject(ApiService)
      .apartments()
      .then(
        (list) => this.apartments.set(list),
        () => this.apartments.set([]),
      );
  }
}
