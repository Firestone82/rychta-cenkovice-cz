import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { PHOTO_CATEGORIES, type PhotoCategory } from '@models/photo-category.model';
import { I18nService } from '@services/i18n.service';

@Component({
  selector: 'rc-gallery-filter',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './gallery-filter.component.html',
  styleUrl: './gallery-filter.component.scss',
})
export class GalleryFilterComponent {
  /** Number of photos per category key; categories without photos get no button. */
  readonly counts = input.required<Record<string, number>>();
  /** Pressed category; `null` is "all". */
  readonly selected = input.required<PhotoCategory | null>();
  /** The visitor pressed a category button; `null` for "all". */
  readonly selectedChange = output<PhotoCategory | null>();

  protected readonly t = inject(I18nService).t;
  protected readonly categories = computed(() =>
    PHOTO_CATEGORIES.filter((key) => this.counts()[key]).map((key) => ({
      key,
      count: this.counts()[key],
    })),
  );
  protected readonly allCount = computed(() =>
    Object.values(this.counts()).reduce((sum, n) => sum + n, 0),
  );
}
