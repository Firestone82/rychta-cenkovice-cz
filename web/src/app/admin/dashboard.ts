import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Api } from '../core/api';
import { I18n } from '../core/i18n/i18n';
import type { Apartment, Booking, Dashboard } from '../core/models';
import { Seo } from '../core/seo';
import { Icon } from '../ui/icon';
import { Spinner } from '../ui/spinner';
import { Toasts } from '../ui/toast';
import { unitNumbers } from './util';

@Component({
  selector: 'rc-admin-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Icon, Spinner],
  template: `
    <div class="a-head">
      <div>
        <h1>{{ t().admin.dashboard.title }}</h1>
        @if (today()) {
          <p>{{ i18n.date(today(), 'long') }}</p>
        }
      </div>
      <div class="a-actions">
        <a class="btn" routerLink="/admin/bookings/new"
          ><rc-icon name="plus" /> {{ t().admin.dashboard.newBooking }}</a
        >
      </div>
    </div>

    @if (data(); as d) {
      <ul class="stats">
        <li>
          <a
            routerLink="/admin/bookings"
            [queryParams]="{ status: 'pending' }"
            [class.is-hot]="d.pending_bookings > 0"
          >
            <span class="num">{{ d.pending_bookings }}</span>
            <span>{{ t().admin.dashboard.pending }}</span>
          </a>
        </li>
        <li>
          <a routerLink="/admin/messages" [class.is-hot]="d.new_messages > 0">
            <span class="num">{{ d.new_messages }}</span>
            <span>{{ t().admin.dashboard.newMessages }}</span>
          </a>
        </li>
        <li>
          <a routerLink="/admin/calendar">
            <span class="num"
              >{{ d.occupied_tonight
              }}<small> {{ t().admin.dashboard.of }} {{ d.apartments }}</small></span
            >
            <span>{{ t().admin.dashboard.occupied }}</span>
          </a>
        </li>
        <li>
          <div>
            <span class="num">{{ d.guests_in_house }}</span>
            <span>{{ t().admin.dashboard.guestsInHouse }}</span>
          </div>
        </li>
      </ul>

      <section class="a-card block">
        <h2>{{ t().admin.dashboard.pendingTitle }}</h2>
        @if (d.pending.length) {
          <ul class="rows">
            @for (b of d.pending; track b.id) {
              <li>
                <a class="who" [routerLink]="['/admin/bookings', b.id]">
                  <strong>{{ b.name }}</strong>
                  <span class="sub"
                    >{{ i18n.range(b.check_in, b.check_out) }},
                    {{ i18n.count(b.nights, t().plural.nights) }}</span
                  >
                </a>
                <span class="units"
                  >{{ t().common.apartment }} {{ units(b)
                  }}<span class="sub">{{ i18n.count(b.guests, t().plural.guests) }}</span></span
                >
                <span class="a-row-actions">
                  <button
                    type="button"
                    class="btn btn-small"
                    [disabled]="busy() === b.id"
                    (click)="decide(b, 'confirmed')"
                  >
                    <rc-icon name="check" /> {{ t().admin.bookings.confirm }}
                  </button>
                  <button
                    type="button"
                    class="btn btn-small btn-quiet"
                    [disabled]="busy() === b.id"
                    (click)="decide(b, 'cancelled')"
                  >
                    {{ t().admin.bookings.decline }}
                  </button>
                </span>
              </li>
            }
          </ul>
        } @else {
          <p class="muted">{{ t().admin.dashboard.pendingEmpty }}</p>
        }
      </section>

      <div class="two">
        <section class="a-card">
          <h2>{{ t().admin.dashboard.arrivals }}</h2>
          @if (d.arrivals.length) {
            <ul class="rows compact">
              @for (b of d.arrivals; track b.id) {
                <li>
                  <span class="day num">{{ i18n.date(b.check_in, 'weekday') }}</span>
                  <a class="who" [routerLink]="['/admin/bookings', b.id]">
                    <strong>{{ b.name }}</strong>
                    <span class="sub"
                      >{{ t().common.apartment }} {{ units(b) }},
                      {{ i18n.count(b.guests, t().plural.guests) }}</span
                    >
                  </a>
                </li>
              }
            </ul>
          } @else {
            <p class="muted">{{ t().admin.dashboard.none }}</p>
          }
        </section>
        <section class="a-card">
          <h2>{{ t().admin.dashboard.departures }}</h2>
          @if (d.departures.length) {
            <ul class="rows compact">
              @for (b of d.departures; track b.id) {
                <li>
                  <span class="day num">{{ i18n.date(b.check_out, 'weekday') }}</span>
                  <a class="who" [routerLink]="['/admin/bookings', b.id]">
                    <strong>{{ b.name }}</strong>
                    <span class="sub">{{ t().common.apartment }} {{ units(b) }}</span>
                  </a>
                </li>
              }
            </ul>
          } @else {
            <p class="muted">{{ t().admin.dashboard.none }}</p>
          }
        </section>
      </div>
    } @else if (failed()) {
      <p class="notice is-error" role="alert">{{ t().common.loadFailed }}</p>
    } @else {
      <rc-spinner [label]="t().common.loading" />
    }
  `,
  styles: `
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 10px;
      margin-bottom: 14px;
    }
    .stats a,
    .stats div {
      display: grid;
      gap: 2px;
      height: 100%;
      padding: 10px 14px 12px;
      background: var(--white);
      border: 1px solid var(--line);
      border-top: 3px solid var(--slate);
      border-radius: var(--radius);
      text-decoration: none;
      color: var(--slate-2);
    }
    .stats a:hover {
      border-color: var(--slate);
    }
    .stats a.is-hot {
      border-top-color: var(--timber);
    }
    .stats .num {
      font-size: 2.1rem;
      line-height: 1;
      color: var(--slate);
    }
    .stats a.is-hot .num {
      color: var(--timber);
    }
    .stats small {
      font-size: 0.5em;
      color: var(--slate-2);
    }
    .block {
      margin-bottom: 14px;
    }
    .two {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(100%, 340px), 1fr));
      gap: 14px;
    }
    .rows li {
      display: grid;
      grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr) auto;
      align-items: center;
      gap: 4px 16px;
      padding: 7px 0;
      border-top: 1px solid var(--line);
    }
    .rows.compact li {
      grid-template-columns: 76px minmax(0, 1fr);
    }
    .who {
      display: grid;
      text-decoration: none;
    }
    .who:hover strong {
      text-decoration: underline;
    }
    .sub {
      display: block;
      font-size: 0.8125rem;
      color: var(--slate-2);
    }
    .day {
      font-size: 1.15rem;
      line-height: 1;
      color: var(--timber);
    }
    @media (max-width: 700px) {
      .rows li {
        grid-template-columns: 1fr;
      }
      .a-row-actions {
        justify-content: flex-start;
      }
    }
  `,
})
export class DashboardPage {
  protected readonly i18n = inject(I18n);
  protected readonly t = this.i18n.t;
  private readonly api = inject(Api);
  private readonly toasts = inject(Toasts);

  protected readonly data = signal<Dashboard | null>(null);
  protected readonly today = signal('');
  protected readonly failed = signal(false);
  protected readonly busy = signal<number | null>(null);
  private readonly apartments = signal<Apartment[]>([]);

  constructor() {
    inject(Seo).noIndex(this.t().admin.dashboard.title);
    this.api.adminApartments().then(
      (list) => this.apartments.set(list),
      () => undefined,
    );
    this.load();
  }

  private load(): void {
    this.api.dashboard().then(
      ({ today, dashboard }) => {
        this.today.set(today);
        this.data.set(dashboard);
      },
      () => this.failed.set(true),
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
