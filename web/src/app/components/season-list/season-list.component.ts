import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { SITE } from '@config/site.config';
import { RevealDirective } from '@directives/reveal.directive';
import { I18nService } from '@services/i18n.service';
import { bundled } from '@utils/images.util';
import { SEASONS } from '@utils/season.util';

@Component({
  selector: 'rc-season-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RevealDirective],
  templateUrl: './season-list.component.html',
  styleUrl: './season-list.component.scss',
})
export class SeasonListComponent {
  protected readonly t = inject(I18nService).t;
  protected readonly seasons = SEASONS.map((key) => ({
    key,
    img: bundled(SITE.media.seasons[key]),
  }));
}
