import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { Api } from '../core/api';
import { I18n } from '../core/i18n/i18n';
import type { Photo } from '../core/models';

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
  template: `
    @if (photo().placeholder) {
      <img class="blur" [src]="photo().placeholder" alt="" aria-hidden="true" />
    }
    <img
      class="full"
      [src]="src()"
      [attr.srcset]="srcset()"
      [attr.sizes]="sizes()"
      [alt]="decorative() ? '' : alt()"
      [attr.width]="photo().width"
      [attr.height]="photo().height"
      [attr.loading]="eager() ? 'eager' : 'lazy'"
      [attr.fetchpriority]="eager() ? 'high' : null"
      decoding="async"
      (load)="loaded.set(true)"
      (error)="loaded.set(true)"
    />
  `,
  styles: `
    :host {
      position: relative;
      display: block;
      overflow: hidden;
      background-color: var(--line);
    }
    img {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .blur {
      filter: blur(14px);
      transform: scale(1.12);
      transition: opacity 0.6s ease 0.2s;
    }
    .full {
      opacity: 0;
      transition: opacity 0.5s ease;
    }
    :host(.is-loaded) .full {
      opacity: 1;
    }
    :host(.is-loaded) .blur {
      opacity: 0;
    }
  `,
})
export class Pic {
  private readonly api = inject(Api);
  private readonly i18n = inject(I18n);

  readonly photo = input.required<Photo>();
  /** CSS sizes attribute: how wide the image is shown. */
  readonly sizes = input('(max-width: 700px) 100vw, 50vw');
  /** Aspect ratio as "4/3"; by default the photo's own. */
  readonly ratio = input<string | null>(null);
  readonly eager = input(false);
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
