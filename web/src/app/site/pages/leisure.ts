import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18n } from '../../core/i18n/i18n';
import type { Season, Trip } from '../../core/i18n/types';
import { IMAGES, ImageName, bundled } from '../../core/images';
import { Links } from '../../core/links';
import { Seo } from '../../core/seo';
import { Icon } from '../../ui/icon';
import { Reveal } from '../../ui/reveal';

const SEASONS: Season[] = ['winter', 'spring', 'summer', 'autumn'];

function tripImage(trip: Trip) {
  const name = `trip-${trip.img}`;
  return trip.img && name in IMAGES ? bundled(name as ImageName) : null;
}

@Component({
  selector: 'rc-leisure',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, NgTemplateOutlet, Icon, Reveal],
  template: `
    <header class="wrap page-head">
      <h1 class="h1">{{ t().leisure.title }}</h1>
      <p class="lead">{{ t().leisure.lead }}</p>
      <nav class="jump" [attr.aria-label]="t().seasons.label">
        @for (s of seasons; track s.key) {
          <a [routerLink]="[]" [fragment]="s.key" [attr.data-season]="s.key">{{
            t().seasons[s.key].name
          }}</a>
        }
      </nav>
    </header>

    <div class="wrap seasons">
      @for (s of seasons; track s.key; let i = $index) {
        <section
          class="season"
          [id]="s.key"
          [attr.data-season]="s.key"
          [class.flip]="i % 2 === 1"
          [attr.aria-labelledby]="'season-' + s.key"
        >
          <img
            [src]="s.img.src"
            [attr.srcset]="s.img.srcset"
            sizes="(max-width: 900px) 100vw, 600px"
            [width]="s.img.width"
            [height]="s.img.height"
            alt=""
            loading="lazy"
            decoding="async"
            rcReveal
          />
          <div class="season-text">
            <h2 class="h1" [id]="'season-' + s.key">
              <span class="mark" aria-hidden="true"></span>{{ t().seasons[s.key].name }}
            </h2>
            <p>{{ t().seasons[s.key].text }}</p>
          </div>
        </section>
      }
    </div>

    <section class="section section-white" aria-labelledby="trips-title">
      <div class="wrap">
        <div class="head">
          <h2 id="trips-title" class="h1">{{ t().leisure.tripsTitle }}</h2>
          <p class="lead muted">{{ t().leisure.tripsLead }}</p>
        </div>
        <ul class="trips">
          @for (trip of trips(); track trip.name) {
            <li>
              <ng-container
                [ngTemplateOutlet]="row"
                [ngTemplateOutletContext]="{ $implicit: trip }"
              />
            </li>
          }
        </ul>
      </div>
    </section>

    <section class="section" aria-labelledby="resorts-title">
      <div class="wrap">
        <div class="head">
          <h2 id="resorts-title" class="h1">{{ t().leisure.resortsTitle }}</h2>
          <p class="lead muted">{{ t().leisure.resortsLead }}</p>
        </div>
        <ul class="trips">
          @for (trip of resorts(); track trip.name) {
            <li>
              <ng-container
                [ngTemplateOutlet]="row"
                [ngTemplateOutletContext]="{ $implicit: trip }"
              />
            </li>
          }
        </ul>
        <p class="cta">
          <a class="btn" [routerLink]="links.to('booking')">{{ t().availability.book }}</a>
          <a class="btn btn-ghost" [routerLink]="links.to('gallery')">{{ t().home.gallery.all }}</a>
        </p>
      </div>
    </section>

    <ng-template #row let-trip>
      <div class="trip" [class.has-img]="trip.image">
        <p class="km">
          @if (trip.km !== null) {
            <span class="num">{{ i18n.number(trip.km) }}</span>
            <span class="unit">km</span>
            <span class="sr-only">{{ t().common.kmFromHouse }}</span>
          }
        </p>
        <div class="trip-text">
          <h3 class="h3">{{ trip.name }}</h3>
          @if (trip.text) {
            <p class="muted">{{ trip.text }}</p>
          }
          @if (trip.url) {
            <p>
              <a class="ext" [href]="trip.url" target="_blank" rel="noopener">
                {{ t().leisure.website }} <rc-icon name="external" />
                <span class="sr-only">{{ trip.name }} ({{ t().common.newTab }})</span>
              </a>
            </p>
          }
        </div>
        @if (trip.image; as image) {
          <img
            [src]="image.src"
            [attr.srcset]="image.srcset"
            sizes="220px"
            [width]="image.width"
            [height]="image.height"
            alt=""
            loading="lazy"
            decoding="async"
          />
        }
      </div>
    </ng-template>
  `,
  styles: `
    .jump {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 8px;
    }
    .jump a {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      min-height: 40px;
      padding: 0 14px;
      border: 1.5px solid var(--edge);
      border-radius: 999px;
      font-weight: 700;
      font-size: 0.95rem;
      text-decoration: none;
      transition: border-color 0.2s;
    }
    .jump a::before {
      content: '';
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: var(--tone);
    }
    .jump a:hover {
      border-color: var(--slate);
    }
    [data-season='winter'] {
      --tone: var(--winter);
    }
    [data-season='spring'] {
      --tone: var(--spring);
    }
    [data-season='summer'] {
      --tone: var(--larch);
    }
    [data-season='autumn'] {
      --tone: var(--autumn);
    }
    .seasons {
      display: grid;
      gap: clamp(48px, 7vw, 104px);
      padding-bottom: var(--section);
    }
    .season {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      gap: 24px clamp(32px, 6vw, 88px);
      align-items: center;
    }
    .season img {
      width: 100%;
      height: auto;
      aspect-ratio: 3 / 2;
      object-fit: cover;
      background: var(--line);
    }
    .season.flip img {
      order: 2;
    }
    .season-text {
      display: grid;
      gap: 18px;
      max-width: 34em;
    }
    /* A hiking trail mark in the colour of the season. */
    .mark {
      display: inline-block;
      width: 0.5em;
      height: 0.5em;
      margin-right: 0.22em;
      vertical-align: 0.08em;
      background: linear-gradient(var(--white) 0 30%, var(--tone) 30% 70%, var(--white) 70%);
      outline: 1px solid var(--line-strong);
    }
    .head {
      display: grid;
      gap: 14px;
      margin-bottom: clamp(28px, 4vw, 52px);
    }
    .trips {
      border-top: 2px solid var(--slate);
    }
    .trip {
      display: grid;
      grid-template-columns: clamp(84px, 11vw, 150px) minmax(0, 1fr) clamp(140px, 17vw, 220px);
      gap: 12px clamp(16px, 3vw, 40px);
      align-items: center;
      padding: 18px 0;
      border-bottom: 1px solid var(--line-strong);
    }
    .km {
      display: flex;
      align-items: baseline;
      gap: 6px;
      align-self: start;
      color: var(--slate-2);
    }
    .km .num {
      font-size: clamp(2.6rem, 4.6vw, 4rem);
      line-height: 0.9;
      color: var(--slate);
    }
    .trip-text {
      display: grid;
      gap: 6px;
      max-width: 42em;
    }
    .trip img {
      width: 100%;
      height: auto;
      aspect-ratio: 4 / 3;
      object-fit: cover;
      background: var(--line);
    }
    .ext {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-weight: 700;
    }
    .cta {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-top: clamp(40px, 5vw, 64px);
    }
    @media (max-width: 900px) {
      .season {
        grid-template-columns: 1fr;
      }
      .season.flip img {
        order: 0;
      }
    }
    @media (max-width: 640px) {
      .trip {
        grid-template-columns: 72px minmax(0, 1fr);
      }
      .trip img {
        grid-column: 2;
        max-width: 260px;
      }
    }
  `,
})
export class LeisurePage {
  protected readonly i18n = inject(I18n);
  protected readonly links = inject(Links);
  protected readonly t = this.i18n.t;

  protected readonly seasons = SEASONS.map((key) => ({ key, img: bundled(`season-${key}`) }));
  protected readonly trips = computed(() =>
    this.t().trips.map((trip) => ({ ...trip, image: tripImage(trip) })),
  );
  protected readonly resorts = computed(() =>
    this.t().resorts.map((trip) => ({ ...trip, image: tripImage(trip) })),
  );

  constructor() {
    inject(Seo).page(this.t().leisure.title, this.t().leisure.lead);
  }
}
