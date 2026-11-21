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
import { ApartmentDetailComponent } from '@components/apartment-detail/apartment-detail.component';
import { ApartmentHeadComponent } from '@components/apartment-head/apartment-head.component';
import { ApartmentIntroComponent } from '@components/apartment-intro/apartment-intro.component';
import { ApartmentOthersComponent } from '@components/apartment-others/apartment-others.component';
import { OccupancyPagerComponent } from '@components/occupancy-pager/occupancy-pager.component';
import { LightboxComponent } from '@components/lightbox/lightbox.component';
import { SpinnerComponent } from '@components/spinner/spinner.component';
import type { Apartment } from '@models/api.model';
import { ApiService } from '@services/api.service';
import { I18nService } from '@services/i18n.service';
import { LinksService } from '@services/links.service';
import { SeoService } from '@services/seo.service';
import { apartmentNumber } from '@utils/links.util';
import { photoSlides } from '@utils/slides.util';

@Component({
  selector: 'rc-apartment-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    LightboxComponent,
    SpinnerComponent,
    OccupancyPagerComponent,
    ApartmentHeadComponent,
    ApartmentIntroComponent,
    ApartmentDetailComponent,
    ApartmentOthersComponent,
  ],
  templateUrl: './apartment.page.html',
  styleUrl: './apartment.page.scss',
})
export class ApartmentPage {
  /** Route parameter in the language of the URL: `apartman-3` or `apartment-3`. */
  readonly slug = input.required<string>();

  protected readonly i18n = inject(I18nService);
  protected readonly links = inject(LinksService);
  protected readonly t = this.i18n.t;
  protected readonly apartment = signal<Apartment | null>(null);
  protected readonly missing = signal(false);
  protected readonly lightbox = signal<number | null>(null);
  protected readonly photos = computed(() => this.apartment()?.photos ?? []);
  protected readonly slides = computed(() => photoSlides(this.photos(), this.api, this.i18n));
  protected readonly others = computed(() =>
    this.all().filter((a) => a.id !== this.apartment()?.id),
  );

  private readonly api = inject(ApiService);
  private readonly seo = inject(SeoService);
  private readonly all = signal<Apartment[]>([]);

  constructor() {
    this.api.apartments().then(
      (list) => this.all.set(list),
      () => undefined,
    );
    effect(() => {
      const number = apartmentNumber(this.slug());
      this.apartment.set(null);
      this.missing.set(false);
      this.lightbox.set(null);
      if (!number) {
        this.missing.set(true);
        return;
      }
      this.api.apartment(`apartman-${number}`).then(
        (a) => {
          if (apartmentNumber(this.slug()) === number) this.apartment.set(a);
        },
        () => this.missing.set(true),
      );
    });
    effect(() => {
      const a = this.apartment();
      if (a) this.seo.page(this.i18n.apartment(a), this.i18n.pick(a.layout));
    });
  }
}
