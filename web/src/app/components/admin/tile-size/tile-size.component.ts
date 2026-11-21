import { ChangeDetectionStrategy, Component, inject, model } from '@angular/core';
import { I18nService } from '@services/i18n.service';

export const TILE_SIZES = ['small', 'medium', 'large'] as const;
export type TileSize = (typeof TILE_SIZES)[number];

export function isTileSize(value: unknown): value is TileSize {
  return (TILE_SIZES as readonly unknown[]).includes(value);
}

/** Switch between small, medium and large tiles, like the view size of a file manager. */
@Component({
  selector: 'rc-tile-size',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tile-size.component.html',
  styleUrl: './tile-size.component.scss',
})
export class TileSizeComponent {
  /** The chosen size. */
  readonly size = model.required<TileSize>();

  protected readonly t = inject(I18nService).t;
  protected readonly sizes = TILE_SIZES;
}
