import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '@services/api.service';
import { I18nService } from '@services/i18n.service';
import { LinksService } from '@services/links.service';
import type { Photo } from '@models/api.model';
import { PicComponent } from '@components/pic/pic.component';

export type SpaceKey = 'commonRoom' | 'facilities' | 'wellness';

export const SPACE_CATEGORY: Record<SpaceKey, string> = {
  commonRoom: 'common-room',
  facilities: 'facilities',
  wellness: 'wellness',
};

@Component({
  selector: 'rc-space-links',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, PicComponent],
  templateUrl: './space-links.component.html',
  styleUrl: './space-links.component.scss',
})
export class SpaceLinksComponent {
  protected readonly links = inject(LinksService);
  private readonly i18n = inject(I18nService);
  private readonly covers = signal<Record<string, Photo>>({});

  /** A space to leave out, used on that space's own page. */
  readonly exclude = input<SpaceKey | null>(null);

  protected readonly items = computed(() => {
    const s = this.i18n.t().spaces;
    const covers = this.covers();
    return (['commonRoom', 'wellness', 'facilities'] as const)
      .filter((key) => key !== this.exclude())
      .map((key) => ({
        key,
        content: s[key],
        photo: covers[SPACE_CATEGORY[key]] as Photo | undefined,
      }));
  });

  constructor() {
    inject(ApiService)
      .photoCovers()
      .then(
        (covers) => this.covers.set(covers),
        () => undefined,
      );
  }
}
