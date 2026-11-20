import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '@services/api.service';
import { I18nService } from '@services/i18n.service';
import { LinksService } from '@services/links.service';
import type { Apartment } from '@models/api.model';
import { SeoService } from '@services/seo.service';
import { SpinnerComponent } from '@components/spinner/spinner.component';
import { OccupancyPagerComponent } from '@components/occupancy-pager/occupancy-pager.component';
import { StepsComponent } from '@components/steps/steps.component';

@Component({
  selector: 'rc-availability',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, OccupancyPagerComponent, SpinnerComponent, StepsComponent],
  templateUrl: './availability.page.html',
  styleUrl: './availability.page.scss',
})
export class AvailabilityPage {
  protected readonly links = inject(LinksService);
  protected readonly t = inject(I18nService).t;
  protected readonly apartments = signal<Apartment[] | null>(null);

  constructor() {
    inject(SeoService).page(this.t().availability.title, this.t().availability.lead);
    inject(ApiService)
      .apartments()
      .then(
        (list) => this.apartments.set(list),
        () => this.apartments.set([]),
      );
  }
}
