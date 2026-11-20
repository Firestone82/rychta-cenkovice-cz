import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { ApiService } from '@services/api.service';
import { I18nService } from '@services/i18n.service';
import type { Photo } from '@models/api.model';

/**
 * A photo from the API. Shows the photo's dominant colour and a tiny blurred preview
 * straight away; the real image is fetched lazily (native lazy loading) in the size
 * the layout needs and fades in once decoded.
 */
@Component({
  selector: 'rc-pic',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[style.aspect-ratio]': 'ratioCss()',
    '[style.background-color]': 'photo().color || null',
    '[class.is-loaded]': 'loaded()',
  },
  templateUrl: './pic.component.html',
  styleUrl: './pic.component.scss',
})
export class PicComponent {
  private readonly api = inject(ApiService);
  private readonly i18n = inject(I18nService);

  /** Photo to show in the best fitting generated size. */
  readonly photo = input.required<Photo>();
  /** CSS sizes attribute: how wide the image is shown. */
  readonly sizes = input('(max-width: 700px) 100vw, 50vw');
  /** Aspect ratio as "4/3"; by default the photo's own. */
  readonly ratio = input<string | null>(null);
  /** Loads the image at once with high priority; for the first photo on a page. */
  readonly eager = input(false);
  /** Hides the image from screen readers when nearby text already says the same. */
  readonly decorative = input(false);

  protected readonly loaded = signal(false);
  protected readonly alt = computed(() => this.i18n.pick(this.photo().alt));
  protected readonly ratioCss = computed(
    () => this.ratio() ?? `${this.photo().width} / ${this.photo().height}`,
  );
  protected readonly src = computed(() => {
    const widths = this.photo().widths;
    return this.api.photoUrl(this.photo(), widths[Math.min(1, widths.length - 1)] ?? 960);
  });
  protected readonly srcset = computed(() => this.api.srcset(this.photo()));
}
