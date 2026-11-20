import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { I18nService } from '@services/i18n.service';
import type { Photo } from '@models/api.model';
import { PicComponent } from '@components/pic/pic.component';

/**
 * A grid of photo tiles. Each tile shows a blurred preview first and downloads its
 * photo only when it scrolls near the viewport; clicking a tile asks to open it.
 */
@Component({
  selector: 'rc-photo-grid',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PicComponent],
  templateUrl: './photo-grid.component.html',
  styleUrl: './photo-grid.component.scss',
})
export class PhotoGridComponent {
  protected readonly i18n = inject(I18nService);
  protected readonly t = this.i18n.t;

  /** Photos shown as tiles. */
  readonly photos = input.required<Photo[]>();
  /** Makes the first photo a large tile. */
  readonly lead = input(false);
  /** Mixes in a larger tile now and then, for long galleries. */
  readonly rhythm = input(false);
  /** How many photos at the top load immediately instead of lazily. */
  readonly eagerCount = input(0);
  /** `sizes` attribute of the tiles, matching the grid columns of the page. */
  readonly sizes = input('(max-width: 560px) 50vw, (max-width: 1100px) 33vw, 320px');
  /** Index of the tile the visitor opened. */
  readonly open = output<number>();
}
