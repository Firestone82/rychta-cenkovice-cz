import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { I18n } from '../core/i18n/i18n';
import type { Photo } from '../core/models';
import { Pic } from './pic';

/**
 * A grid of photo tiles. Each tile shows a blurred preview first and downloads its
 * photo only when it scrolls near the viewport; clicking a tile asks to open it.
 */
@Component({
  selector: 'rc-photo-grid',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Pic],
  template: `
    <ul class="grid" [class.lead]="lead()">
      @for (photo of photos(); track photo.id; let i = $index) {
        <li [class.wide]="rhythm() && i % 10 === 0" [class.tall]="rhythm() && i % 10 === 6">
          <button
            type="button"
            (click)="open.emit(i)"
            [attr.aria-label]="t().gallery.open + ': ' + (i18n.pick(photo.alt) || i + 1)"
          >
            <rc-pic
              [photo]="photo"
              [ratio]="null"
              [decorative]="true"
              [eager]="i < eagerCount()"
              [sizes]="sizes()"
            />
          </button>
        </li>
      }
    </ul>
  `,
  styles: `
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(min(100%, 250px), 1fr));
      grid-auto-rows: 1fr;
      grid-auto-flow: dense;
      gap: 6px;
    }
    li {
      position: relative;
      aspect-ratio: 4 / 3;
    }
    li.wide {
      grid-column: span 2;
      grid-row: span 2;
      aspect-ratio: auto;
    }
    li.tall {
      grid-row: span 2;
      aspect-ratio: auto;
    }
    .grid.lead li:first-child {
      grid-column: span 2;
      grid-row: span 2;
      aspect-ratio: auto;
    }
    button {
      position: absolute;
      inset: 0;
      display: block;
      width: 100%;
      height: 100%;
      padding: 0;
      border: 0;
      background: var(--line);
      overflow: hidden;
    }
    button:focus-visible {
      outline-offset: -3px;
      z-index: 1;
    }
    rc-pic {
      width: 100%;
      height: 100%;
      aspect-ratio: auto !important;
      transition:
        scale 0.6s var(--ease),
        filter 0.3s;
    }
    button:hover rc-pic {
      scale: 1.04;
      filter: brightness(1.06);
    }
    @media (max-width: 560px) {
      .grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }
  `,
})
export class PhotoGrid {
  protected readonly i18n = inject(I18n);
  protected readonly t = this.i18n.t;

  readonly photos = input.required<Photo[]>();
  /** Makes the first photo a large tile. */
  readonly lead = input(false);
  /** Mixes in a larger tile now and then, for long galleries. */
  readonly rhythm = input(false);
  /** How many photos at the top load immediately instead of lazily. */
  readonly eagerCount = input(0);
  readonly sizes = input('(max-width: 560px) 50vw, (max-width: 1100px) 33vw, 320px');
  readonly open = output<number>();
}
