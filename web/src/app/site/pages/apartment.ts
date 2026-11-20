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
import { Api } from '../../core/api';
import { I18n } from '../../core/i18n/i18n';
import { Links, apartmentNumber } from '../../core/links';
import type { Apartment } from '../../core/models';
import { Seo } from '../../core/seo';
import { Icon } from '../../ui/icon';
import { Lightbox } from '../../ui/lightbox';
import { PhotoGrid } from '../../ui/photo-grid';
import { Pic } from '../../ui/pic';
import { Spinner } from '../../ui/spinner';
import { AptFacts } from '../apt-facts';
import { OccupancyPager } from '../occupancy-pager';

@Component({
  selector: 'rc-apartment',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Pic, PhotoGrid, Lightbox, Spinner, Icon, AptFacts, OccupancyPager],
  template: `
    @if (apartment(); as a) {
      <header class="wrap page-head">
        <a class="back" [routerLink]="links.to('accommodation')"
          ><rc-icon name="back" /> {{ t().apartment.backToList }}</a
        >
        <div class="title">
          <span class="no num" aria-hidden="true">{{ a.number }}</span>
          <div>
            <h1 class="h1">{{ t().common.apartment }} {{ a.number }}</h1>
            <p class="type">{{ i18n.pick(a.type) }}</p>
          </div>
        </div>
      </header>

      <section class="wrap top">
        @if (photos()[0]; as cover) {
          <button
            type="button"
            class="cover"
            (click)="lightbox.set(0)"
            [attr.aria-label]="t().gallery.open"
          >
            <rc-pic
              [photo]="cover"
              ratio="3/2"
              [eager]="true"
              [decorative]="true"
              sizes="(max-width: 900px) 100vw, 700px"
            />
          </button>
        }
        <div class="summary">
          <rc-apt-facts [apartment]="a" />
          <div>
            <h2 class="label">{{ t().apartment.layoutTitle }}</h2>
            <p>{{ i18n.pick(a.layout) }}</p>
          </div>
          <p class="price">
            @if (a.price_per_night !== null) {
              <strong class="num">{{ i18n.money(a.price_per_night) }}</strong>
              {{ t().common.perNight }}
            } @else {
              <strong>{{ t().common.priceOnRequest }}</strong>
            }
          </p>
          <div class="actions">
            <a class="btn" [routerLink]="links.to('booking')" [queryParams]="{ a: a.number }">{{
              t().apartment.book
            }}</a>
          </div>
        </div>
      </section>

      <section class="section section-white">
        <div class="wrap detail">
          <div>
            <h2 class="h2 sub">{{ t().apartment.featuresTitle }}</h2>
            <ul class="roofs">
              @for (f of i18n.pickList(a.features); track f) {
                <li>{{ f }}</li>
              }
            </ul>
            @if (i18n.pick(a.note); as note) {
              <p class="notice note">{{ note }}</p>
            }
          </div>
          @if (photos().length > 1) {
            <div>
              <h2 class="h2 sub">{{ t().apartment.photosTitle }}</h2>
              <rc-photo-grid
                [photos]="photos()"
                (open)="lightbox.set($event)"
                sizes="(max-width: 560px) 50vw, 260px"
              />
            </div>
          }
        </div>
      </section>

      <section class="section" aria-labelledby="apt-occupancy">
        <div class="wrap">
          <h2 id="apt-occupancy" class="h2">{{ t().apartment.availabilityTitle }}</h2>
          <p class="lead muted occ-lead">{{ t().apartment.availabilityLead }}</p>
          <rc-occupancy-pager [apartments]="[a]" [linked]="false" />
        </div>
      </section>

      @if (others().length) {
        <section class="section section-white" aria-labelledby="apt-others">
          <div class="wrap">
            <h2 id="apt-others" class="h2 sub">{{ t().apartment.others }}</h2>
            <ul class="others">
              @for (o of others(); track o.id) {
                <li>
                  <a [routerLink]="links.apartment(o.number)">
                    <span class="num">{{ o.number }}</span>
                    <span>
                      <strong>{{ t().common.apartment }} {{ o.number }}</strong>
                      <span class="muted"
                        >{{ o.area }} {{ t().common.areaUnit }},
                        {{ i18n.count(o.beds, t().plural.beds) }}</span
                      >
                    </span>
                  </a>
                </li>
              }
            </ul>
          </div>
        </section>
      }

      <rc-lightbox [photos]="photos()" [(index)]="lightbox" />
    } @else if (missing()) {
      <div class="wrap page-head">
        <h1 class="h1">{{ t().apartment.notFound }}</h1>
        <p>
          <a class="btn" [routerLink]="links.to('accommodation')">{{ t().apartment.backToList }}</a>
        </p>
      </div>
    } @else {
      <div class="wrap page-head"><rc-spinner [label]="t().common.loading" /></div>
    }
  `,
  styles: `
    .page-head {
      padding-bottom: clamp(20px, 3vw, 36px);
    }
    .title {
      display: flex;
      align-items: center;
      gap: clamp(14px, 2vw, 28px);
    }
    .no {
      font-size: clamp(6rem, 14vw, 11rem);
      line-height: 0.74;
      color: var(--timber);
    }
    .type {
      margin-top: 6px;
      font-size: 1.2rem;
      color: var(--slate-2);
    }
    .top {
      display: grid;
      grid-template-columns: minmax(0, 1.25fr) minmax(0, 0.75fr);
      gap: 32px clamp(32px, 5vw, 72px);
      align-items: end;
      padding-bottom: var(--section);
    }
    .cover {
      display: block;
      width: 100%;
      padding: 0;
      border: 0;
      background: var(--line);
      clip-path: polygon(0 9%, 50% 0, 100% 9%, 100% 100%, 0 100%);
    }
    .summary {
      display: grid;
      gap: 22px;
    }
    .label {
      font-size: 0.95rem;
      font-weight: 700;
      color: var(--slate-2);
      margin-bottom: 4px;
    }
    .price .num {
      font-size: 2.4rem;
      line-height: 1;
      margin-right: 4px;
    }
    .price strong:not(.num) {
      font-size: 1.2rem;
    }
    .detail {
      display: grid;
      grid-template-columns: minmax(0, 0.85fr) minmax(0, 1.15fr);
      gap: 48px clamp(32px, 6vw, 88px);
      align-items: start;
    }
    .sub {
      margin-bottom: clamp(20px, 3vw, 32px);
    }
    .note {
      margin-top: 28px;
      background: var(--snow);
    }
    .occ-lead {
      margin: 12px 0 28px;
    }
    .others {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(min(100%, 210px), 1fr));
      gap: 12px;
    }
    .others a {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 14px 16px;
      border: 1.5px solid var(--edge);
      border-radius: var(--radius);
      text-decoration: none;
      transition:
        border-color 0.2s,
        background 0.2s;
    }
    .others a:hover {
      border-color: var(--slate);
      background: var(--snow);
    }
    .others .num {
      font-size: 3rem;
      line-height: 0.8;
      color: var(--timber);
    }
    .others a > span:last-child {
      display: grid;
      line-height: 1.3;
    }
    @media (max-width: 900px) {
      .top,
      .detail {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class ApartmentPage {
  protected readonly i18n = inject(I18n);
  protected readonly links = inject(Links);
  protected readonly t = this.i18n.t;
  private readonly api = inject(Api);
  private readonly seo = inject(Seo);

  /** Route parameter: apartman-3 / apartment-3. */
  readonly slug = input.required<string>();

  protected readonly apartment = signal<Apartment | null>(null);
  protected readonly all = signal<Apartment[]>([]);
  protected readonly missing = signal(false);
  protected readonly lightbox = signal<number | null>(null);
  protected readonly photos = computed(() => this.apartment()?.photos ?? []);
  protected readonly others = computed(() =>
    this.all().filter((a) => a.id !== this.apartment()?.id),
  );

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
      if (a) this.seo.page(`${this.t().common.apartment} ${a.number}`, this.i18n.pick(a.layout));
    });
  }
}
