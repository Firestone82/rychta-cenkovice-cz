import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18n } from '../core/i18n/i18n';
import { Links } from '../core/links';
import type { Apartment } from '../core/models';
import { Icon } from '../ui/icon';
import { Pic } from '../ui/pic';
import { AptLabels } from './apt-labels';

/**
 * The house in section: the gable split into its three floors, each apartment a cell
 * sized by its floor area. Selecting a cell shows that apartment next to the diagram.
 */
@Component({
  selector: 'rc-house-diagram',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Pic, Icon, AptLabels],
  template: `
    <div class="layout">
      <div class="house" role="group" [attr.aria-label]="t().home.house.title">
        <div class="row">
          <span class="level" aria-hidden="true"></span>
          <div class="band peak" aria-hidden="true"><div class="boards"></div></div>
        </div>
        @for (floor of upper(); track floor.level) {
          <div class="row">
            <span class="level">{{ t().common.floor[floor.level - 1] }}</span>
            <div class="band" [class.f3]="floor.level === 3" [class.f2]="floor.level === 2">
              @for (a of floor.apartments; track a.id) {
                <button
                  type="button"
                  class="cell"
                  [style.flex-grow]="a.area"
                  [attr.aria-pressed]="selectedId() === a.id"
                  (click)="select(a)"
                  (mouseenter)="select(a)"
                  (focus)="select(a)"
                >
                  <span class="sr-only">{{ t().common.apartment }}</span>
                  <span class="no num">{{ a.number }}</span>
                  <span class="meta">{{ a.area }} m²</span>
                  <span class="sr-only">, {{ i18n.count(a.beds, t().plural.beds) }}</span>
                </button>
              }
            </div>
          </div>
        }
        <div class="row">
          <span class="level">{{ t().common.floor[0] }}</span>
          <div class="band plinth">
            @for (a of ground(); track a.id) {
              <button
                type="button"
                class="cell"
                [style.flex-grow]="a.area"
                [attr.aria-pressed]="selectedId() === a.id"
                (click)="select(a)"
                (mouseenter)="select(a)"
                (focus)="select(a)"
              >
                <span class="sr-only">{{ t().common.apartment }}</span>
                <span class="no num">{{ a.number }}</span>
                <span class="meta">{{ a.area }} m²</span>
                <span class="sr-only">, {{ i18n.count(a.beds, t().plural.beds) }}</span>
              </button>
            }
            <div class="shared">
              <span>{{ t().home.house.shared }}</span>
            </div>
          </div>
        </div>
        <p class="note">{{ t().home.house.note }}</p>
      </div>

      @if (selected(); as a) {
        <article class="panel" aria-live="polite">
          @for (item of [a]; track item.id) {
            <div class="swap">
              @if (item.cover; as cover) {
                <rc-pic [photo]="cover" ratio="4/3" sizes="(max-width: 900px) 100vw, 480px" />
              }
              <div class="text">
                <h3 class="h3">
                  {{ t().common.apartment }} {{ item.number }}
                  @if (i18n.flatType(item.flat_type); as type) {
                    <span class="type">{{ type }}</span>
                  }
                </h3>
                <ul class="facts">
                  <li><rc-icon name="area" /> {{ item.area }} m²</li>
                  <li>
                    <rc-icon name="bed" /> {{ i18n.count(item.beds, t().plural.beds) }}
                    @if (item.extra_beds) {
                      + {{ item.extra_beds }} {{ t().common.extraBeds }}
                    }
                  </li>
                  <li><rc-icon name="stairs" /> {{ t().common.floor[item.floor - 1] }}</li>
                  @if (item.accessible) {
                    <li><rc-icon name="access" /> {{ t().common.stepFree }}</li>
                  }
                </ul>
                <rc-apt-labels [labels]="item.labels" />
                <p class="layout-text">{{ i18n.pick(item.layout) }}</p>
                <p class="price">
                  @if (item.price_per_night !== null) {
                    <strong>{{ i18n.money(item.price_per_night) }}</strong>
                    {{ t().common.perNight }}
                  } @else {
                    {{ t().common.priceOnRequest }}
                  }
                </p>
                <div class="actions">
                  <a class="btn" [routerLink]="links.apartment(item.number)">{{
                    t().accommodation.detail
                  }}</a>
                  <a
                    class="btn btn-ghost"
                    [routerLink]="links.to('booking')"
                    [queryParams]="{ a: item.number }"
                    >{{ t().nav.book }}</a
                  >
                </div>
              </div>
            </div>
          }
        </article>
      }
    </div>
  `,
  styles: `
    .layout {
      display: grid;
      grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr);
      gap: clamp(28px, 5vw, 72px);
      align-items: end;
    }
    .house {
      --band: clamp(104px, 13vw, 150px);
    }
    .row {
      display: grid;
      grid-template-columns: clamp(52px, 8vw, 84px) minmax(0, 1fr);
      align-items: end;
    }
    .level {
      padding: 0 10px 12px 0;
      font-size: 0.85rem;
      line-height: 1.2;
      color: var(--slate-2);
      text-align: right;
    }
    .band {
      display: flex;
      gap: 3px;
      height: var(--band);
      background: var(--snow);
    }
    .peak {
      clip-path: polygon(50% 0, 66.67% 100%, 33.33% 100%);
      background: var(--timber);
      color: rgba(243, 245, 244, 0.55);
    }
    .peak .boards {
      flex: 1;
      background-size: 22px 16px;
      background-position:
        0 0,
        11px 0;
    }
    .f3 {
      clip-path: polygon(33.33% 0, 66.67% 0, 83.33% 100%, 16.67% 100%);
      margin-top: 3px;
    }
    .f2 {
      clip-path: polygon(16.67% 0, 83.33% 0, 100% 100%, 0 100%);
      margin-top: 3px;
    }
    .plinth {
      margin-top: 3px;
      height: calc(var(--band) * 0.82);
    }
    .cell {
      flex: 1 1 0;
      min-width: 0;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      align-items: center;
      gap: 0;
      padding: 0 6px 10px;
      border: 0;
      background: var(--timber);
      color: var(--white);
      transition:
        background 0.2s,
        color 0.2s;
    }
    .f3 .cell:first-child {
      padding-left: 20%;
    }
    .f3 .cell:last-child {
      padding-right: 20%;
    }
    .f2 .cell:first-child {
      padding-left: 9%;
    }
    .f2 .cell:last-child {
      padding-right: 9%;
    }
    .plinth .cell {
      background: var(--white);
      color: var(--slate);
      box-shadow: inset 0 0 0 2px var(--slate);
    }
    .cell:hover,
    .cell[aria-pressed='true'] {
      background: var(--slate);
      color: var(--white);
    }
    .cell:focus-visible {
      outline-offset: -5px;
      outline-color: var(--white);
    }
    .no {
      font-size: clamp(2.6rem, 5.4vw, 4.2rem);
      line-height: 0.85;
    }
    .meta {
      font-size: 0.85rem;
      font-weight: 500;
      white-space: nowrap;
      opacity: 0.9;
    }
    .shared {
      flex: 100 1 0;
      display: grid;
      place-items: end start;
      padding: 0 0 10px 14px;
      color: var(--slate-2);
      font-size: 0.85rem;
      background:
        repeating-linear-gradient(-55deg, transparent 0 9px, var(--line) 9px 10px), var(--white);
      box-shadow: inset 0 0 0 2px var(--slate);
    }
    .shared span {
      background: var(--white);
      padding: 0 6px;
    }
    .note {
      margin: 12px 0 0;
      padding-left: clamp(52px, 8vw, 84px);
      font-size: 0.85rem;
      color: var(--slate-2);
    }
    .panel {
      min-width: 0;
    }
    .swap {
      animation: swap 0.35s var(--ease);
    }
    @keyframes swap {
      from {
        opacity: 0;
        transform: translateY(8px);
      }
    }
    .text {
      padding-top: 20px;
    }
    .type {
      display: block;
      margin-top: 6px;
      font-family: var(--font-body);
      font-size: 1rem;
      font-weight: 500;
      color: var(--slate-2);
    }
    .facts {
      display: flex;
      flex-wrap: wrap;
      gap: 6px 20px;
      margin-top: 14px;
      font-weight: 500;
    }
    .facts li {
      display: inline-flex;
      align-items: center;
      gap: 7px;
    }
    .facts rc-icon {
      color: var(--timber);
    }
    .layout-text {
      margin-top: 12px;
      color: var(--slate-2);
      min-height: 3.2em;
    }
    .price {
      margin-top: 10px;
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 18px;
    }
    @media (max-width: 900px) {
      .layout {
        grid-template-columns: 1fr;
        align-items: start;
      }
    }
    @media (max-width: 520px) {
      .meta {
        font-size: 0.72rem;
      }
      .level {
        font-size: 0.72rem;
        padding-right: 6px;
      }
      .cell {
        padding-inline: 2px;
      }
      .f3 .cell:first-child {
        padding-left: 18%;
      }
      .f3 .cell:last-child {
        padding-right: 18%;
      }
    }
  `,
})
export class HouseDiagram {
  protected readonly i18n = inject(I18n);
  protected readonly links = inject(Links);
  protected readonly t = this.i18n.t;

  readonly apartments = input.required<Apartment[]>();

  protected readonly selectedId = signal<number | null>(null);
  protected readonly selected = computed(() => {
    const list = this.apartments();
    return list.find((a) => a.id === this.selectedId()) ?? list[0] ?? null;
  });
  protected readonly upper = computed(() =>
    [3, 2]
      .map((level) => ({ level, apartments: this.apartments().filter((a) => a.floor === level) }))
      .filter((f) => f.apartments.length > 0),
  );
  protected readonly ground = computed(() => this.apartments().filter((a) => a.floor <= 1));

  protected select(a: Apartment): void {
    this.selectedId.set(a.id);
  }
}
