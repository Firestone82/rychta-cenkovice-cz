import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { I18n } from '../core/i18n/i18n';
import type { Trip } from '../core/i18n/types';

/**
 * Destinations listed like a Czech trail signpost: place on the left, kilometres on the
 * right, the board ending in an arrow.
 */
@Component({
  selector: 'rc-signpost',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="post">
      <p class="head">
        <span class="mark" aria-hidden="true"></span>
        {{ t().leisure.signpost }}
      </p>
      <ul>
        @for (trip of trips(); track trip.name) {
          <li>
            <span class="name">{{ trip.name }}</span>
            @if (trip.km !== null) {
              <span class="km"
                ><span class="num">{{ i18n.number(trip.km) }}</span> km</span
              >
            }
          </li>
        }
      </ul>
    </div>
  `,
  styles: `
    .post {
      max-width: 520px;
    }
    .head {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      padding: 6px 14px 6px 8px;
      background: var(--slate);
      color: var(--white);
      font-weight: 700;
      font-size: 0.95rem;
    }
    /* trail mark: white, red, white */
    .mark {
      width: 20px;
      height: 20px;
      background: linear-gradient(var(--white) 0 33%, #c8281e 33% 67%, var(--white) 67%);
    }
    ul {
      display: grid;
      gap: 5px;
      margin-top: 5px;
    }
    li {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 16px;
      padding: 9px 34px 9px 14px;
      background: var(--white);
      clip-path: polygon(0 0, calc(100% - 18px) 0, 100% 50%, calc(100% - 18px) 100%, 0 100%);
      transition: translate 0.25s var(--ease);
    }
    li:hover {
      translate: 6px 0;
    }
    .name {
      font-weight: 700;
    }
    .km {
      white-space: nowrap;
      color: var(--slate-2);
    }
    .km .num {
      font-size: 1.5rem;
      line-height: 1;
      color: var(--slate);
    }
  `,
})
export class Signpost {
  protected readonly i18n = inject(I18n);
  protected readonly t = this.i18n.t;
  readonly trips = input.required<Trip[]>();
}
