import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SITE } from '@config/site.config';
import type { Season } from '@models/i18n.model';
import { I18nService } from '@services/i18n.service';
import { LinksService } from '@services/links.service';
import { bundled } from '@utils/images.util';
import { SEASONS, currentSeason } from '@utils/season.util';
import { StaySearchComponent } from './stay-search/stay-search.component';

@Component({
  selector: 'rc-home-hero',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, StaySearchComponent],
  templateUrl: './home-hero.component.html',
  styleUrl: './home-hero.component.scss',
})
export class HomeHeroComponent {
  protected readonly t = inject(I18nService).t;
  protected readonly links = inject(LinksService);

  protected readonly seasons = SEASONS;
  protected readonly photos = Object.fromEntries(
    SEASONS.map((season) => [season, bundled(SITE.media.hero[season])]),
  ) as Record<Season, ReturnType<typeof bundled>>;
  protected readonly season = signal<Season>(currentSeason());
  /** Seasons whose photo has been requested; the others are not downloaded until chosen. */
  protected readonly seen = signal<Season[]>([currentSeason()]);

  protected pick(season: Season): void {
    if (!this.seen().includes(season)) this.seen.update((list) => [...list, season]);
    this.season.set(season);
  }
}
