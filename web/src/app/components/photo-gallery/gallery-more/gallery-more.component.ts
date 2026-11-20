import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { SpinnerComponent } from '@components/spinner/spinner.component';
import { I18nService } from '@services/i18n.service';

@Component({
  selector: 'rc-gallery-more',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SpinnerComponent],
  templateUrl: './gallery-more.component.html',
  styleUrl: './gallery-more.component.scss',
})
export class GalleryMoreComponent {
  /** Number of photos loaded so far. */
  readonly shown = input.required<number>();
  /** Number of photos in the chosen category; 0 hides the counter. */
  readonly total = input.required<number>();
  /** A page is being loaded. */
  readonly loading = input(false);
  /** The last page failed to load; offers a retry. */
  readonly failed = input(false);
  /** The visitor asked for the next page, or for a retry after a failure. */
  readonly more = output<void>();

  protected readonly i18n = inject(I18nService);
  protected readonly t = this.i18n.t;
  protected readonly hasMore = computed(() => this.shown() < this.total());
}
