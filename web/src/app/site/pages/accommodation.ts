import { Location } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Api } from '../../core/api';
import { addDays, isISO, nightsBetween, todayISO } from '../../core/dates';
import { valueOf } from '../../core/forms';
import { I18n } from '../../core/i18n/i18n';
import { Links } from '../../core/links';
import type { Apartment } from '../../core/models';
import { Seo } from '../../core/seo';
import { Pic } from '../../ui/pic';
import { Reveal } from '../../ui/reveal';
import { Spinner } from '../../ui/spinner';
import { AptFacts } from '../apt-facts';
import { AptLabels } from '../apt-labels';
import { SpaceLinks } from '../space-links';

@Component({
  selector: 'rc-accommodation',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Pic, Reveal, Spinner, AptFacts, AptLabels, SpaceLinks],
  template: `
    <header class="wrap page-head">
      <h1 class="h1">{{ t().accommodation.title }}</h1>
      <p class="lead">{{ t().accommodation.lead }}</p>
    </header>

    <section class="wrap list" aria-labelledby="list-title">
      <h2 id="list-title" class="sr-only">{{ t().accommodation.listTitle }}</h2>
      <form class="dates" (submit)="$event.preventDefault()" aria-labelledby="dates-title">
        <div class="dates-text">
          <h3 id="dates-title" class="h3">{{ t().accommodation.dates.title }}</h3>
          <p class="muted">{{ t().accommodation.dates.hint }}</p>
        </div>
        <div class="field">
          <label for="acc-from">{{ t().booking.checkIn }}</label>
          <input
            id="acc-from"
            class="input"
            type="date"
            [min]="today"
            [value]="from()"
            (change)="setFrom(value($event))"
          />
        </div>
        <div class="field">
          <label for="acc-to">{{ t().booking.checkOut }}</label>
          <input
            id="acc-to"
            class="input"
            type="date"
            [min]="minTo()"
            [value]="to()"
            (change)="setTo(value($event))"
            [attr.aria-invalid]="invalid() ? 'true' : null"
            aria-describedby="acc-dates-msg"
          />
        </div>
        @if (from() || to()) {
          <button type="button" class="btn btn-quiet clear" (click)="clear()">
            {{ t().accommodation.dates.clear }}
          </button>
        }
        <p id="acc-dates-msg" class="dates-msg" aria-live="polite">
          @if (invalid()) {
            <span class="error">{{ t().booking.datesInvalid }}</span>
          } @else if (failed()) {
            <span class="error">{{ t().accommodation.dates.failed }}</span>
          } @else if (taken(); as ids) {
            {{ summary(ids) }}
          }
        </p>
      </form>

      @if (apartments(); as list) {
        @if (list.length) {
          <ul class="cards">
            @for (a of list; track a.id; let i = $index) {
              <li [rcReveal]="(i % 3) * 80" [class.is-taken]="state(a) === 'taken'">
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
                      <p class="type">{{ i18n.flatType(a.flat_type) }}</p>
                    </div>
                  </div>
                  <rc-apt-labels [labels]="a.labels" />
                  <rc-apt-facts [apartment]="a" />
                  @switch (state(a)) {
                    @case ('free') {
                      <p class="state">
                        <span class="tag tag-confirmed">{{ t().accommodation.dates.free }}</span>
                      </p>
                    }
                    @case ('taken') {
                      <p class="state">
                        <span class="tag tag-taken">{{ t().accommodation.dates.taken }}</span>
                      </p>
                    }
                    @case ('short') {
                      <p class="state">
                        <span class="tag tag-pending">{{ minNightsText(a) }}</span>
                      </p>
                    }
                  }
                  <p class="price">
                    @if (a.price_per_night === null) {
                      {{ t().common.priceOnRequest }}
                    } @else if (nights() > 0) {
                      <strong>{{ i18n.money(a.price_per_night * nights()) }}</strong>
                      {{ forStayText() }}
                      <span class="per muted">{{ perNightText(a.price_per_night) }}</span>
                    } @else {
                      <strong>{{ i18n.money(a.price_per_night) }}</strong> {{ t().common.perNight }}
                    }
                  </p>
                </a>
                @if (state(a) === 'free') {
                  <a
                    class="btn btn-small book"
                    [routerLink]="links.to('booking')"
                    [queryParams]="{ from: from(), to: to(), a: a.number }"
                    >{{ t().accommodation.dates.book
                    }}<span class="sr-only">: {{ t().common.apartment }} {{ a.number }}</span></a
                  >
                }
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
    .dates {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 190px 190px auto;
      gap: 12px 16px;
      align-items: end;
      margin-bottom: clamp(32px, 4vw, 56px);
      padding: 18px 20px;
      background: var(--white);
      border: 1.5px solid var(--slate);
      border-radius: var(--radius);
    }
    .dates .field {
      min-width: 0;
    }
    .dates-text {
      display: grid;
      gap: 2px;
      align-self: center;
    }
    .dates .input,
    .dates .clear {
      height: 48px;
    }
    .dates-msg {
      grid-column: 1 / -1;
      font-weight: 700;
    }
    .dates-msg:empty {
      display: none;
    }
    .dates-msg .error {
      color: var(--timber);
    }
    .cards > li {
      display: grid;
      align-content: start;
      justify-items: start;
      gap: 14px;
    }
    .is-taken rc-pic {
      filter: grayscale(1);
      opacity: 0.55;
    }
    .tag-taken {
      background: var(--snow);
      color: var(--slate-2);
    }
    .per {
      display: block;
      font-size: 0.92rem;
    }
    .cards {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: clamp(32px, 4vw, 56px) clamp(24px, 3vw, 44px);
    }
    .card {
      display: grid;
      gap: 12px;
      width: 100%;
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
        grid-template-columns: minmax(0, 1fr);
      }
      .dates {
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      }
      .dates-text,
      .dates .clear {
        grid-column: 1 / -1;
      }
    }
    @media (max-width: 520px) {
      .dates {
        grid-template-columns: minmax(0, 1fr);
        padding: 16px;
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
  private readonly api = inject(Api);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly location = inject(Location);
  protected readonly apartments = signal<Apartment[] | null>(null);
  protected readonly value = valueOf;

  /** The stay the visitor is looking at; kept in the address as ?from=…&to=…. */
  protected readonly today = todayISO();
  protected readonly from = signal('');
  protected readonly to = signal('');
  protected readonly minTo = computed(() =>
    isISO(this.from()) ? addDays(this.from(), 1) : addDays(this.today, 1),
  );
  protected readonly invalid = computed(
    () => isISO(this.from()) && isISO(this.to()) && this.to() <= this.from(),
  );
  protected readonly nights = computed(() =>
    isISO(this.from()) && isISO(this.to()) && this.to() > this.from()
      ? nightsBetween(this.from(), this.to())
      : 0,
  );
  /** Ids of apartments taken in the chosen dates; null until dates are chosen and checked. */
  protected readonly taken = signal<number[] | null>(null);
  protected readonly failed = signal(false);

  constructor() {
    inject(Seo).page(this.t().accommodation.title, this.t().accommodation.lead);
    this.api.apartments().then(
      (list) => this.apartments.set(list),
      () => this.apartments.set([]),
    );

    const query = this.route.snapshot.queryParamMap;
    const from = query.get('from');
    const to = query.get('to');
    if (isISO(from) && from >= this.today) {
      this.from.set(from);
      this.to.set(isISO(to) && to > from ? to : addDays(from, 2));
    }

    effect((onCleanup) => {
      const [checkIn, checkOut, nights] = [this.from(), this.to(), this.nights()];
      this.taken.set(null);
      this.failed.set(false);
      if (!nights) return;
      let current = true;
      onCleanup(() => (current = false));
      this.api.checkAvailability(checkIn, checkOut).then(
        (ids) => current && this.taken.set(ids),
        () => current && this.failed.set(true),
      );
    });
  }

  protected setFrom(value: string): void {
    this.from.set(value);
    if (isISO(value) && (!isISO(this.to()) || this.to() <= value)) this.to.set(addDays(value, 2));
    this.remember();
  }

  protected setTo(value: string): void {
    this.to.set(value);
    this.remember();
  }

  protected clear(): void {
    this.from.set('');
    this.to.set('');
    this.remember();
  }

  /**
   * Keeps the chosen dates in the address, so the view can be shared or reloaded. The address
   * is replaced in place: a router navigation would replay the page transition on every change.
   */
  private remember(): void {
    const tree = this.router.createUrlTree([], {
      relativeTo: this.route,
      queryParams: this.nights() ? { from: this.from(), to: this.to() } : {},
    });
    this.location.replaceState(this.router.serializeUrl(tree));
  }

  /** How one apartment stands for the chosen dates. */
  protected state(a: Apartment): 'free' | 'taken' | 'short' | null {
    const taken = this.taken();
    if (!taken) return null;
    if (taken.includes(a.id)) return 'taken';
    return this.nights() < a.min_nights ? 'short' : 'free';
  }

  protected summary(taken: number[]): string {
    const total = this.apartments()?.length ?? 0;
    return this.i18n.fill(this.t().accommodation.dates.summary, {
      range: this.i18n.range(this.from(), this.to()),
      nights: this.i18n.count(this.nights(), this.t().plural.nights),
      free: (this.apartments() ?? []).filter((a) => !taken.includes(a.id)).length,
      total,
    });
  }

  protected minNightsText(a: Apartment): string {
    return this.i18n.fill(this.t().accommodation.dates.minNights, {
      n: this.i18n.count(a.min_nights, this.t().plural.nights),
    });
  }

  protected forStayText(): string {
    return this.i18n.fill(this.t().accommodation.dates.forStay, {
      nights: this.i18n.count(this.nights(), this.t().plural.nights),
    });
  }

  protected perNightText(price: number): string {
    return this.i18n.fill(this.t().accommodation.dates.perNight, { price: this.i18n.money(price) });
  }
}
