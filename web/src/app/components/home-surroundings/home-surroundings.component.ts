import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LightboxComponent } from '@components/photo-grid/lightbox/lightbox.component';
import { PicComponent } from '@components/pic/pic.component';
import { SignpostComponent } from '@components/signpost/signpost.component';
import { RevealDirective } from '@directives/reveal.directive';
import type { Photo } from '@models/api.model';
import { ApiService } from '@services/api.service';
import { I18nService } from '@services/i18n.service';
import { LinksService } from '@services/links.service';

@Component({
  selector: 'rc-home-surroundings',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, PicComponent, SignpostComponent, LightboxComponent, RevealDirective],
  templateUrl: './home-surroundings.component.html',
  styleUrl: './home-surroundings.component.scss',
})
export class HomeSurroundingsComponent {
  protected readonly i18n = inject(I18nService);
  protected readonly t = this.i18n.t;
  protected readonly links = inject(LinksService);

  protected readonly photos = signal<Photo[]>([]);
  protected readonly lightbox = signal<number | null>(null);
  protected readonly nearest = computed(() => this.t().trips.slice(0, 6));

  constructor() {
    inject(ApiService)
      .photos({ limit: 5, category: 'surroundings' })
      .then(
        (page) => this.photos.set(page.items),
        () => undefined,
      );
  }
}
