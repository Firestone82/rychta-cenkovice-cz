import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { PhotoManagerComponent } from '@components/admin/photo-manager/photo-manager.component';
import {
  type TileSize,
  TileSizeComponent,
  isTileSize,
} from '@components/admin/tile-size/tile-size.component';
import { I18nService } from '@services/i18n.service';
import { SeoService } from '@services/seo.service';
import { readStored, writeStored } from '@utils/storage.util';

const SIZE_KEY = 'rc_admin_photo_size';

@Component({
  selector: 'rc-admin-photos-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PhotoManagerComponent, TileSizeComponent],
  templateUrl: './photos.page.html',
  styleUrl: './photos.page.scss',
})
export class PhotosPage {
  protected readonly t = inject(I18nService).t;
  protected readonly size = signal<TileSize>(this.storedSize());

  constructor() {
    inject(SeoService).noIndex(this.t().admin.photos.title);
  }

  protected setSize(size: TileSize): void {
    this.size.set(size);
    writeStored(SIZE_KEY, size);
  }

  private storedSize(): TileSize {
    const stored = readStored<unknown>(SIZE_KEY, null);
    return isTileSize(stored) ? stored : 'medium';
  }
}
