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
import { Links } from '../../core/links';
import type { Photo } from '../../core/models';
import { Seo } from '../../core/seo';
import { Icon } from '../../ui/icon';
import { Lightbox } from '../../ui/lightbox';
import { PhotoGrid } from '../../ui/photo-grid';
import { Pic } from '../../ui/pic';
import { SPACE_CATEGORY, SpaceKey, SpaceLinks } from '../space-links';

/** One shared part of the house: the common room, the facilities or the wellness. */
@Component({
  selector: 'rc-space',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Pic, PhotoGrid, Lightbox, SpaceLinks, Icon],
  template: `
    <header class="wrap page-head">
      <a class="back" [routerLink]="links.to('accommodation')"
        ><rc-icon name="back" /> {{ t().nav.accommodation }}</a
      >
      <h1 class="h1">{{ content().title }}</h1>
    </header>

    <section class="wrap top">
      <div class="intro">
        <p class="fact">
          <span class="num">{{ content().fact }}</span>
          <span>{{ content().factLabel }}</span>
        </p>
        <p class="lead">{{ content().intro }}</p>
      </div>
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
            sizes="(max-width: 900px) 100vw, 640px"
          />
        </button>
      } @else {
        <div class="cover ph"></div>
      }
    </section>

    <section class="section section-white">
      <div class="wrap groups">
        @for (group of content().groups; track group.title) {
          <div>
            <h2 class="h3">{{ group.title }}</h2>
            <ul class="roofs">
              @for (item of group.items; track item) {
                <li>{{ item }}</li>
              }
            </ul>
          </div>
        }
      </div>
    </section>

    @if (photos().length > 1) {
      <section class="section" aria-labelledby="space-photos">
        <div class="wrap">
          <h2 id="space-photos" class="h2 sub">{{ t().apartment.photosTitle }}</h2>
          <rc-photo-grid [photos]="photos()" (open)="lightbox.set($event)" />
        </div>
      </section>
    }

    <section class="section section-white" aria-labelledby="space-others">
      <div class="wrap">
        <h2 id="space-others" class="h2 sub">{{ t().accommodation.sharedTitle }}</h2>
        <rc-space-links [exclude]="space()" />
        <p class="cta">
          <a class="btn" [routerLink]="links.to('booking')">{{ t().availability.book }}</a>
          <a class="btn btn-ghost" [routerLink]="links.to('accommodation')">{{
            t().home.house.all
          }}</a>
        </p>
      </div>
    </section>

    <rc-lightbox [photos]="photos()" [(index)]="lightbox" />
  `,
  styles: `
    .page-head {
      padding-bottom: clamp(20px, 3vw, 36px);
    }
    .top {
      display: grid;
      grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
      gap: 32px clamp(32px, 6vw, 88px);
      align-items: end;
      padding-bottom: var(--section);
    }
    .fact {
      display: grid;
      gap: 4px;
      margin-bottom: 24px;
      color: var(--slate-2);
    }
    .fact .num {
      font-size: clamp(3.4rem, 7vw, 6rem);
      line-height: 0.85;
      color: var(--timber);
    }
    .cover {
      display: block;
      width: 100%;
      padding: 0;
      border: 0;
      background: var(--line);
      clip-path: polygon(0 9%, 50% 0, 100% 9%, 100% 100%, 0 100%);
    }
    .cover.ph {
      aspect-ratio: 3 / 2;
    }
    .groups {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(100%, 300px), 1fr));
      gap: 40px clamp(32px, 5vw, 72px);
    }
    .groups .h3 {
      margin-bottom: 16px;
    }
    .sub {
      margin-bottom: clamp(24px, 3vw, 40px);
    }
    .cta {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-top: clamp(40px, 5vw, 64px);
    }
    @media (max-width: 900px) {
      .top {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class SpacePage {
  protected readonly i18n = inject(I18n);
  protected readonly links = inject(Links);
  protected readonly t = this.i18n.t;
  private readonly api = inject(Api);
  private readonly seo = inject(Seo);

  /** Which space this page shows; set by the route data. */
  readonly space = input.required<SpaceKey>();

  protected readonly content = computed(() => this.t().spaces[this.space()]);
  protected readonly photos = signal<Photo[]>([]);
  protected readonly lightbox = signal<number | null>(null);

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
