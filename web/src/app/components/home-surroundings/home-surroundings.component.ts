import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LightboxComponent } from '@components/lightbox/lightbox.component';
import { PicComponent } from '@components/pic/pic.component';
import { SignpostComponent } from '@components/signpost/signpost.component';
import { RevealDirective } from '@directives/reveal.directive';
import type { Photo } from '@models/api.model';
import { ApiService } from '@services/api.service';
import { I18nService } from '@services/i18n.service';
import { LinksService } from '@services/links.service';
import { photoSlides } from '@utils/slides.util';

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
  protected readonly slides = computed(() => photoSlides(this.photos(), this.api, this.i18n));
  protected readonly nearest = computed(() => this.t().trips.slice(0, 6));

  private readonly api = inject(ApiService);

  constructor() {
    this.api.photos({ limit: 5, category: 'surroundings' }).then(
      (page) => this.photos.set(page.items),
      () => undefined,
    );
  }
}
