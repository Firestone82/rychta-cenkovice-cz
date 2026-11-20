import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ApartmentListComponent } from '@components/apartment-list/apartment-list.component';
import { ApartmentOverviewComponent } from '@components/apartment-overview/apartment-overview.component';
import { SpaceLinksComponent } from '@components/space-links/space-links.component';
import type { Apartment } from '@models/api.model';
import { ApiService } from '@services/api.service';
import { I18nService } from '@services/i18n.service';
import { SeoService } from '@services/seo.service';

@Component({
  selector: 'rc-accommodation-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ApartmentListComponent, ApartmentOverviewComponent, SpaceLinksComponent],
  templateUrl: './accommodation.page.html',
  styleUrl: './accommodation.page.scss',
})
export class AccommodationPage {
  protected readonly t = inject(I18nService).t;
  protected readonly apartments = signal<Apartment[] | null>(null);

  constructor() {
    inject(SeoService).page(this.t().accommodation.title, this.t().accommodation.lead);
    inject(ApiService)
      .apartments()
      .then(
        (list) => this.apartments.set(list),
        () => this.apartments.set([]),
      );
  }
}
