import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Api } from '../../core/api';
import { I18n } from '../../core/i18n/i18n';
import { Links } from '../../core/links';
import type { Apartment } from '../../core/models';
import { Seo } from '../../core/seo';
import { Spinner } from '../../ui/spinner';
import { OccupancyPager } from '../occupancy-pager';
import { Steps } from '../steps';

@Component({
  selector: 'rc-availability',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, OccupancyPager, Spinner, Steps],
  template: `
    <header class="wrap page-head">
      <h1 class="h1">{{ t().availability.title }}</h1>
      <p class="lead">{{ t().availability.lead }}</p>
    </header>

    <section class="wrap calendar">
      @if (apartments(); as list) {
        @if (list.length) {
          <rc-occupancy-pager [apartments]="list" [level]="2" />
        } @else {
          <p class="notice is-error">{{ t().common.loadFailed }}</p>
        }
      } @else {
        <rc-spinner [label]="t().common.loading" />
      }
      <p class="book">
        <a class="btn" [routerLink]="links.to('booking')">{{ t().availability.book }}</a>
      </p>
    </section>

    <section class="section section-white" aria-labelledby="av-steps">
      <div class="wrap">
        <h2 id="av-steps" class="h1 steps-title">{{ t().home.steps.title }}</h2>
        <rc-steps />
      </div>
    </section>
  `,
  styles: `
    .calendar {
      padding-bottom: var(--section);
    }
    .book {
      margin-top: 36px;
    }
    .steps-title {
      margin-bottom: clamp(32px, 5vw, 56px);
    }
  `,
})
export class AvailabilityPage {
  protected readonly links = inject(Links);
  protected readonly t = inject(I18n).t;
  protected readonly apartments = signal<Apartment[] | null>(null);

  constructor() {
    inject(Seo).page(this.t().availability.title, this.t().availability.lead);
    inject(Api)
      .apartments()
      .then(
        (list) => this.apartments.set(list),
        () => this.apartments.set([]),
      );
  }
}
