import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeasonListComponent } from '@components/season-list/season-list.component';
import { TripListComponent } from '@components/trip-list/trip-list.component';
import { I18nService } from '@services/i18n.service';
import { LinksService } from '@services/links.service';
import { SeoService } from '@services/seo.service';
import { SEASONS } from '@utils/season.util';

@Component({
  selector: 'rc-leisure',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, SeasonListComponent, TripListComponent],
  templateUrl: './leisure.page.html',
  styleUrl: './leisure.page.scss',
})
export class LeisurePage {
  protected readonly t = inject(I18nService).t;
  protected readonly links = inject(LinksService);
  protected readonly seasons = SEASONS;

  constructor() {
    inject(SeoService).page(this.t().leisure.title, this.t().leisure.lead);
  }
}
