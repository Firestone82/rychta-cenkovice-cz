import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Api } from '../../core/api';
import { I18n } from '../../core/i18n/i18n';
import { Links } from '../../core/links';
import type { Apartment } from '../../core/models';
import { Seo } from '../../core/seo';
import { Pic } from '../../ui/pic';
import { Reveal } from '../../ui/reveal';
import { Spinner } from '../../ui/spinner';
import { AptFacts } from '../apt-facts';
import { SpaceLinks } from '../space-links';

@Component({
  selector: 'rc-accommodation',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Pic, Reveal, Spinner, AptFacts, SpaceLinks],
  template: `
    <header class="wrap page-head">
      <h1 class="h1">{{ t().accommodation.title }}</h1>
      <p class="lead">{{ t().accommodation.lead }}</p>
    </header>

    <section class="wrap list" aria-labelledby="list-title">
      <h2 id="list-title" class="sr-only">{{ t().accommodation.listTitle }}</h2>
      @if (apartments(); as list) {
        @if (list.length) {
          <ul class="cards">
            @for (a of list; track a.id; let i = $index) {
              <li [rcReveal]="(i % 3) * 80">
                <a class="card" [routerLink]="links.apartment(a.number)">
                  @if (a.cover; as cover) {
                    <rc-pic
                      [photo]="cover"
                      ratio="4/3"
                      [decorative]="true"
                      sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 400px"
                    />
                  } @else {
                    <div class="ph"></div>
                  }
                  <div class="body">
                    <span class="no num" aria-hidden="true">{{ a.number }}</span>
                    <div>
                      <h3 class="h3">{{ t().common.apartment }} {{ a.number }}</h3>
                      <p class="type">{{ i18n.pick(a.type) }}</p>
                    </div>
                  </div>
                  <rc-apt-facts [apartment]="a" />
                  <p class="price">
                    @if (a.price_per_night !== null) {
                      <strong>{{ i18n.money(a.price_per_night) }}</strong> {{ t().common.perNight }}
                    } @else {
                      {{ t().common.priceOnRequest }}
                    }
                  </p>
                </a>
              </li>
            }
          </ul>
        } @else {
          <p class="notice is-error">{{ t().common.loadFailed }}</p>
        }
      } @else {
        <rc-spinner [label]="t().common.loading" />
      }
    </section>

    <section class="section section-white every">
      <div class="wrap every-grid">
        <div>
          <ul class="roofs points">
            @for (p of t().accommodation.points; track p) {
              <li>{{ p }}</li>
            }
          </ul>
          <p class="note muted">{{ t().accommodation.note }}</p>
        </div>

        <div>
          <div
            class="table-scroll"
            tabindex="0"
            role="region"
            [attr.aria-label]="t().accommodation.table.layout"
          >
            <table class="table">
              <thead>
                <tr>
                  <th scope="col">{{ t().accommodation.table.apartment }}</th>
                  <th scope="col">{{ t().accommodation.table.floor }}</th>
                  <th scope="col">{{ t().accommodation.table.area }}</th>
                  <th scope="col">{{ t().accommodation.table.beds }}</th>
                  <th scope="col">{{ t().accommodation.table.layout }}</th>
                </tr>
              </thead>
              <tbody>
                @for (a of apartments() ?? []; track a.id) {
                  <tr>
                    <th scope="row">
                      <a [routerLink]="links.apartment(a.number)"
                        >{{ t().common.apartment }} {{ a.number }}</a
                      >
                    </th>
                    <td class="nowrap">{{ t().common.floor[a.floor - 1] }}</td>
                    <td class="nowrap">{{ a.area }} {{ t().common.areaUnit }}</td>
                    <td class="nowrap">
                      {{ a.beds }}
                      @if (a.extra_beds) {
                        + {{ a.extra_beds }}
                      }
                    </td>
                    <td>{{ i18n.pick(a.layout) }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          <p class="total">{{ t().accommodation.totalBeds }}</p>
        </div>
      </div>
    </section>

    <section class="section" aria-labelledby="shared-title">
      <div class="wrap">
        <h2 id="shared-title" class="h1 shared-title">{{ t().accommodation.sharedTitle }}</h2>
        <rc-space-links />
      </div>
    </section>
  `,
  styles: `
    .list {
      padding-bottom: var(--section);
    }
    .cards {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: clamp(32px, 4vw, 56px) clamp(24px, 3vw, 44px);
    }
    .card {
      display: grid;
      gap: 12px;
      text-decoration: none;
    }
    rc-pic,
    .ph {
      aspect-ratio: 4 / 3;
      background: var(--line);
      clip-path: polygon(0 0, 50% 0, 100% 0, 100% 100%, 0 100%);
      transition: clip-path 0.5s var(--ease);
    }
    .card:hover rc-pic,
    .card:focus-visible rc-pic {
      clip-path: polygon(0 7%, 50% 0, 100% 7%, 100% 100%, 0 100%);
    }
    .body {
      display: flex;
      align-items: center;
      gap: 14px;
      margin-top: 4px;
    }
    .no {
      font-size: 4.6rem;
      line-height: 0.8;
      color: var(--timber);
    }
    .type {
      color: var(--slate-2);
    }
    .card:hover .h3 {
      text-decoration: underline var(--timber) 2px;
      text-underline-offset: 5px;
    }
    .price strong {
      font-size: 1.15rem;
    }
    .every-grid {
      display: grid;
      grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
      gap: 40px clamp(32px, 6vw, 96px);
      align-items: start;
    }
    .points {
      font-size: 1.1rem;
    }
    .note {
      margin-top: 24px;
      max-width: 34em;
    }
    .nowrap {
      white-space: nowrap;
    }
    .table a {
      font-weight: 700;
    }
    .total {
      margin-top: 16px;
      font-weight: 700;
    }
    .shared-title {
      margin-bottom: clamp(28px, 4vw, 56px);
    }
    @media (max-width: 1100px) {
      .cards {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }
    @media (max-width: 900px) {
      .every-grid {
        grid-template-columns: 1fr;
      }
    }
    @media (max-width: 700px) {
      .cards {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class AccommodationPage {
  protected readonly i18n = inject(I18n);
  protected readonly links = inject(Links);
  protected readonly t = this.i18n.t;
  protected readonly apartments = signal<Apartment[] | null>(null);

  constructor() {
    inject(Seo).page(this.t().accommodation.title, this.t().accommodation.lead);
    inject(Api)
      .apartments()
      .then(
        (list) => this.apartments.set(list),
        () => this.apartments.set([]),
      );
  }
}
