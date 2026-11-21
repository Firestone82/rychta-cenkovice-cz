import { HttpErrorResponse } from '@angular/common/http';
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
import { apartmentNumber, commandsToPath } from '@utils/links.util';
import { photoSlides } from '@utils/slides.util';
import { apartmentData, breadcrumbs } from '@utils/structured-data.util';

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
        this.seo.page(this.t().apartment.notFound);
        this.seo.notFound();
        return;
      }
      this.api.apartment(`apartman-${number}`).then(
        (a) => {
          if (apartmentNumber(this.slug()) === number) this.apartment.set(a);
        },
        (error: unknown) => {
          this.missing.set(true);
          this.seo.page(this.t().apartment.notFound);
          if (error instanceof HttpErrorResponse && error.status === 404) this.seo.notFound();
          else this.seo.unavailable();
        },
      );
    });
    effect(() => {
      const a = this.apartment();
      if (a) this.describe(a);
      else this.seo.structuredData('apartment', null);
    });
  }

  /** Title, description, preview picture and structured data of the apartment. */
  private describe(a: Apartment): void {
    const name = this.i18n.apartment(a);
    const description = this.i18n.pick(a.description) || this.i18n.pick(a.layout);
    const images = (a.photos?.length ? a.photos : a.cover ? [a.cover] : [])
      .slice(0, 4)
      .map((p) => this.seo.absolute(this.api.photoUrl(p, previewWidth(p.widths))));
    this.seo.page(name, description, { image: images[0] });
    const url = this.seo.absolute(commandsToPath(this.links.apartment(a.number)));
    const home = this.seo.absolute(`/${this.i18n.lang()}`);
    const list = this.seo.absolute(commandsToPath(this.links.to('accommodation')));
    this.seo.structuredData('apartment', {
      '@graph': [
        apartmentData(a, { origin: this.seo.origin, url, name, description, images }),
        breadcrumbs([
          { name: this.t().nav.home, url: home },
          { name: this.t().nav.accommodation, url: list },
          { name, url },
        ]),
      ],
    });
  }
}

/** The smallest generated size that still fills a link preview (1200 px), else the largest. */
function previewWidth(widths: number[]): number {
  const sorted = [...widths].sort((x, y) => x - y);
  return sorted.find((w) => w >= 1200) ?? sorted[sorted.length - 1];
}
