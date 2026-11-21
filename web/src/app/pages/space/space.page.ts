import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '@components/icon/icon.component';
import { LightboxComponent } from '@components/lightbox/lightbox.component';
import { PhotoGridComponent } from '@components/photo-grid/photo-grid.component';
import { SpaceGroupsComponent } from '@components/space-groups/space-groups.component';
import { SpaceIntroComponent } from '@components/space-intro/space-intro.component';
import {
  SPACE_CATEGORY,
  type SpaceKey,
  SpaceLinksComponent,
} from '@components/space-links/space-links.component';
import type { Photo } from '@models/api.model';
import { ApiService } from '@services/api.service';
import { I18nService } from '@services/i18n.service';
import { LinksService } from '@services/links.service';
import { SeoService } from '@services/seo.service';
import { photoSlides } from '@utils/slides.util';

@Component({
  selector: 'rc-space-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    PhotoGridComponent,
    LightboxComponent,
    SpaceLinksComponent,
    SpaceIntroComponent,
    SpaceGroupsComponent,
    IconComponent,
  ],
  templateUrl: './space.page.html',
  styleUrl: './space.page.scss',
})
export class SpacePage {
  /** Shared part of the house this page shows; set by the route data. */
  readonly space = input.required<SpaceKey>();

  protected readonly i18n = inject(I18nService);
  protected readonly links = inject(LinksService);
  protected readonly t = this.i18n.t;
  protected readonly content = computed(() => this.t().spaces[this.space()]);
  protected readonly photos = signal<Photo[]>([]);
  protected readonly lightbox = signal<number | null>(null);
  protected readonly slides = computed(() => photoSlides(this.photos(), this.api, this.i18n));

  private readonly api = inject(ApiService);
  private readonly seo = inject(SeoService);

  constructor() {
    effect(() => {
      const content = this.content();
      this.seo.page(content.title, content.intro);
    });
    effect(() => {
      const category = SPACE_CATEGORY[this.space()];
      this.photos.set([]);
      this.api.photos({ category, limit: 60 }).then(
        (page) => {
          if (SPACE_CATEGORY[this.space()] === category) this.photos.set(page.items);
        },
        () => undefined,
      );
    });
  }
}
