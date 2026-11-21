import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { LightboxComponent } from '@components/lightbox/lightbox.component';
import { SITE } from '@config/site.config';
import { RevealDirective } from '@directives/reveal.directive';
import { I18nService } from '@services/i18n.service';
import { bundled, bundledSlide } from '@utils/images.util';
import { SEASONS } from '@utils/season.util';

@Component({
  selector: 'rc-season-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RevealDirective, LightboxComponent],
  templateUrl: './season-list.component.html',
  styleUrl: './season-list.component.scss',
})
export class SeasonListComponent {
  protected readonly t = inject(I18nService).t;
  protected readonly seasons = SEASONS.map((key) => ({
    key,
    img: bundled(SITE.media.seasons[key]),
  }));
  protected readonly lightbox = signal<number | null>(null);
  protected readonly slides = computed(() =>
    SEASONS.flatMap(
      (key) => bundledSlide(SITE.media.seasons[key], this.t().seasons[key].name) ?? [],
    ),
  );
}
