import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Api } from '../core/api';
import { I18n } from '../core/i18n/i18n';
import { Links } from '../core/links';
import type { Photo } from '../core/models';
import { Pic } from '../ui/pic';

export type SpaceKey = 'commonRoom' | 'facilities' | 'wellness';

export const SPACE_CATEGORY: Record<SpaceKey, string> = {
  commonRoom: 'common-room',
  facilities: 'facilities',
  wellness: 'wellness',
};

/** Links to the shared parts of the house (common room, facilities, wellness), each with its cover photo. */
@Component({
  selector: 'rc-space-links',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Pic],
  template: `
    <ul class="grid" [class.two]="items().length === 2">
      @for (item of items(); track item.key) {
        <li>
          <a class="space" [routerLink]="links.to(item.key)">
            @if (item.photo; as photo) {
              <rc-pic
                [photo]="photo"
                ratio="4/3"
                [decorative]="true"
                sizes="(max-width: 800px) 100vw, 33vw"
              />
            } @else {
              <div class="ph"></div>
            }
            <p class="fact">
              <span class="num">{{ item.content.fact }}</span> {{ item.content.factLabel }}
            </p>
            <h3 class="h3">{{ item.content.title }}</h3>
          </a>
        </li>
      }
    </ul>
  `,
  styles: `
    .grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: clamp(24px, 3vw, 44px);
    }
    .grid.two {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .space {
      display: block;
      text-decoration: none;
    }
    rc-pic,
    .ph {
      aspect-ratio: 4 / 3;
      background: var(--line);
      clip-path: polygon(0 0, 50% 0, 100% 0, 100% 100%, 0 100%);
      transition: clip-path 0.5s var(--ease);
    }
    .space:hover rc-pic,
    .space:focus-visible rc-pic {
      clip-path: polygon(0 7%, 50% 0, 100% 7%, 100% 100%, 0 100%);
    }
    .fact {
      margin-top: 16px;
      color: var(--slate-2);
      font-size: 0.98rem;
    }
    .num {
      margin-right: 6px;
      font-size: 1.5rem;
      line-height: 1;
      color: var(--timber);
    }
    .h3 {
      margin-top: 2px;
      text-decoration: underline transparent 2px;
      text-underline-offset: 5px;
      transition: text-decoration-color 0.2s;
    }
    .space:hover .h3 {
      text-decoration-color: var(--timber);
    }
    @media (max-width: 800px) {
      .grid,
      .grid.two {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class SpaceLinks {
  protected readonly links = inject(Links);
  private readonly i18n = inject(I18n);
  private readonly covers = signal<Record<string, Photo>>({});

  /** A space to leave out, used on that space's own page. */
  readonly exclude = input<SpaceKey | null>(null);

  protected readonly items = computed(() => {
    const s = this.i18n.t().spaces;
    const covers = this.covers();
    return (['commonRoom', 'wellness', 'facilities'] as const)
      .filter((key) => key !== this.exclude())
      .map((key) => ({
        key,
        content: s[key],
        photo: covers[SPACE_CATEGORY[key]] as Photo | undefined,
      }));
  });

  constructor() {
    inject(Api)
      .photoCovers()
      .then(
        (covers) => this.covers.set(covers),
        () => undefined,
      );
  }
}
