import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Api } from '../core/api';
import { valueOf } from '../core/forms';
import { I18n } from '../core/i18n/i18n';
import type { Apartment, Booking } from '../core/models';
import { Seo } from '../core/seo';
import { Icon } from '../ui/icon';
import { Spinner } from '../ui/spinner';
import { Toasts } from '../ui/toast';
import { statusClass, unitNumbers } from './util';

type Filter = 'active' | 'pending' | 'confirmed' | 'cancelled' | '';

@Component({
  selector: 'rc-admin-bookings',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Icon, Spinner],
  template: `
    <div class="a-head">
      <h1>{{ t().admin.bookings.title }}</h1>
      <div class="a-actions">
        <a
          class="btn btn-quiet"
          routerLink="/admin/bookings/new"
          [queryParams]="{ kind: 'block' }"
          >{{ t().admin.bookings.newBlock }}</a
        >
        <a class="btn" routerLink="/admin/bookings/new"
          ><rc-icon name="plus" /> {{ t().admin.bookings.new }}</a
        >
      </div>
    </div>

    <div class="a-filters">
      <div class="a-seg" role="group" [attr.aria-label]="t().admin.bookings.statusLabel">
        @for (f of filters; track f.value) {
          <button
            type="button"
            [attr.aria-pressed]="filter() === f.value"
            (click)="filter.set(f.value)"
          >
            {{ t().admin.bookings[f.label] }}
          </button>
        }
      </div>
      <div class="field search">
        <label class="sr-only" for="bk-q">{{ t().admin.bookings.search }}</label>
        <input
          id="bk-q"
          class="input"
          type="search"
          [placeholder]="t().admin.bookings.search"
          [value]="query()"
          (input)="type(value($event))"
        />
      </div>
    </div>

    @if (items(); as list) {
      @if (list.length) {
        <div class="a-table-wrap">
          <table class="a-table">
            <thead>
              <tr>
                <th scope="col">{{ t().admin.bookings.cols.guest }}</th>
                <th scope="col">{{ t().admin.bookings.cols.dates }}</th>
                <th scope="col">{{ t().admin.bookings.cols.units }}</th>
                <th scope="col">{{ t().admin.bookings.cols.guests }}</th>
                <th scope="col">{{ t().admin.bookings.cols.status }}</th>
                <th scope="col" class="right">{{ t().admin.bookings.cols.price }}</th>
                <th scope="col">
                  <span class="sr-only">{{ t().admin.bookings.edit }}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              @for (b of list; track b.id) {
                <tr>
                  <th scope="row">
                    <a [routerLink]="['/admin/bookings', b.id]">{{
                      b.name || t().admin.bookings.kind.block
                    }}</a>
                    <span class="sub">{{ b.code }}, {{ t().admin.bookings.source[b.source] }}</span>
                  </th>
                  <td class="nowrap">
                    {{ i18n.range(b.check_in, b.check_out) }}
                    <span class="sub">{{ i18n.count(b.nights, t().plural.nights) }}</span>
                  </td>
                  <td class="nowrap">{{ units(b) }}</td>
                  <td>{{ b.kind === 'guest' ? b.guests : '' }}</td>
                  <td>
                    <span class="tag" [class]="'tag ' + tagClass(b)">{{
                      b.kind === 'block' && b.status !== 'cancelled'
                        ? t().admin.bookings.kind.block
                        : t().admin.bookings.status[b.status]
                    }}</span>
                  </td>
                  <td class="right nowrap">
                    {{ b.total_price !== null ? i18n.money(b.total_price) : '' }}
                  </td>
                  <td>
                    <span class="a-row-actions">
                      @if (b.status === 'pending') {
                        <button
                          type="button"
                          class="btn btn-small"
                          [disabled]="busy() === b.id"
                          (click)="decide(b, 'confirmed')"
                        >
                          {{ t().admin.bookings.confirm }}
                        </button>
                        <button
                          type="button"
                          class="btn btn-small btn-quiet"
                          [disabled]="busy() === b.id"
                          (click)="decide(b, 'cancelled')"
                        >
                          {{ t().admin.bookings.decline }}
                        </button>
                      } @else {
                        <a
                          class="a-icon-btn"
                          [routerLink]="['/admin/bookings', b.id]"
                          [attr.aria-label]="t().admin.bookings.edit + ': ' + (b.name || b.code)"
                          ><rc-icon name="edit"
                        /></a>
                      }
                    </span>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      } @else {
        <p class="a-empty">{{ failed() ? t().common.loadFailed : t().admin.bookings.empty }}</p>
      }
    } @else {
      <rc-spinner [label]="t().common.loading" />
    }
  `,
  styles: `
    .search {
      flex: 1 1 220px;
      max-width: 340px;
    }
    th a {
      font-weight: 700;
    }
  `,
})
export class BookingsPage {
  protected readonly i18n = inject(I18n);
  protected readonly t = this.i18n.t;
  private readonly api = inject(Api);
  private readonly toasts = inject(Toasts);

  protected readonly filters: {
    value: Filter;
    label: 'filterActive' | 'filterPending' | 'filterConfirmed' | 'filterCancelled' | 'filterAll';
  }[] = [
    { value: 'active', label: 'filterActive' },
    { value: 'pending', label: 'filterPending' },
    { value: 'confirmed', label: 'filterConfirmed' },
    { value: 'cancelled', label: 'filterCancelled' },
    { value: '', label: 'filterAll' },
  ];
  protected readonly filter = signal<Filter>('active');
  protected readonly query = signal('');
  private readonly search = signal('');
  protected readonly items = signal<Booking[] | null>(null);
  protected readonly failed = signal(false);
  protected readonly busy = signal<number | null>(null);
  private readonly apartments = signal<Apartment[]>([]);
  protected readonly value = valueOf;
  protected readonly tagClass = statusClass;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private request = 0;

  constructor() {
    inject(Seo).noIndex(this.t().admin.bookings.title);
    const status = inject(ActivatedRoute).snapshot.queryParamMap.get('status');
    if (status === 'pending' || status === 'confirmed' || status === 'cancelled')
      this.filter.set(status);
    this.api.adminApartments().then(
      (list) => this.apartments.set(list),
      () => undefined,
    );
    effect(() => {
      this.filter();
      this.search();
      untracked(() => this.load());
    });
  }

  protected type(text: string): void {
    this.query.set(text);
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.search.set(text.trim()), 250);
  }

  private load(): void {
    const request = ++this.request;
    this.api
      .adminBookings({
        status: this.filter(),
        q: this.search(),
        order: this.filter() === 'pending' ? 'created' : 'arrival',
      })
      .then(
        (list) => {
          if (request !== this.request) return;
          this.failed.set(false);
          this.items.set(list);
        },
        () => {
          if (request !== this.request) return;
          this.failed.set(true);
          this.items.set([]);
        },
      );
  }

  protected units(b: Booking): string {
    return unitNumbers(b, this.apartments());
  }

  protected async decide(b: Booking, status: 'confirmed' | 'cancelled'): Promise<void> {
    this.busy.set(b.id);
    try {
      await this.api.updateBooking(b.id, { status, notify: true });
      this.toasts.show(this.t().admin.bookings.saved);
      this.load();
    } catch {
      this.toasts.show(this.t().admin.common.error, 'error');
    } finally {
      this.busy.set(null);
    }
  }
}
