import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  model,
  output,
  viewChild,
} from '@angular/core';
import { Api } from '../core/api';
import { I18n } from '../core/i18n/i18n';
import type { Photo } from '../core/models';
import { Icon } from './icon';

/**
 * Full-screen photo viewer built on the native <dialog>, which gives focus trapping,
 * Escape to close and the inert background for free. Arrow keys and swipes change the photo.
 */
@Component({
  selector: 'rc-lightbox',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    <dialog
      #dialog
      (close)="index.set(null)"
      (click)="backdrop($event)"
      (keydown)="key($event)"
      [attr.aria-label]="counter()"
    >
      @if (current(); as photo) {
        <figure (touchstart)="touchStart($event)" (touchend)="touchEnd($event)">
          <div
            class="frame"
            [style.aspect-ratio]="photo.width + ' / ' + photo.height"
            [style.background-image]="'url(' + photo.placeholder + ')'"
          >
            @for (p of [photo]; track p.id) {
              <img
                [src]="url(p)"
                [attr.srcset]="api.srcset(p)"
                sizes="100vw"
                [alt]="i18n.pick(p.alt)"
                [attr.width]="p.width"
                [attr.height]="p.height"
              />
            }
          </div>
          <figcaption>
            <span>{{ i18n.pick(photo.alt) }}</span>
            <span class="count" aria-live="polite">{{ counter() }}</span>
          </figcaption>
        </figure>
        <button
          type="button"
          class="ctl close"
          (click)="close()"
          [attr.aria-label]="i18n.t().common.close"
        >
          <rc-icon name="close" />
        </button>
        @if (photos().length > 1) {
          <button
            type="button"
            class="ctl prev"
            (click)="step(-1)"
            [attr.aria-label]="i18n.t().common.previous"
          >
            <rc-icon name="left" />
          </button>
          <button
            type="button"
            class="ctl next"
            (click)="step(1)"
            [attr.aria-label]="i18n.t().common.next"
          >
            <rc-icon name="right" />
          </button>
        }
      }
    </dialog>
  `,
  styles: `
    dialog {
      width: 100vw;
      height: 100dvh;
      max-width: none;
      max-height: none;
      margin: 0;
      padding: 0;
      border: 0;
      background: rgba(22, 27, 31, 0.96);
      color: var(--snow);
    }
    dialog[open] {
      display: grid;
      place-items: center;
      animation: fade 0.25s ease;
    }
    dialog::backdrop {
      background: rgba(22, 27, 31, 0.6);
    }
    figure {
      display: grid;
      gap: 12px;
      justify-items: center;
      width: 100%;
      padding: 56px clamp(8px, 6vw, 88px) 20px;
    }
    .frame {
      max-width: 100%;
      max-height: calc(100dvh - 130px);
      background-size: cover;
      overflow: hidden;
      animation: rise 0.35s var(--ease);
    }
    img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      animation: fade 0.3s ease;
    }
    figcaption {
      display: flex;
      gap: 1.5rem;
      justify-content: space-between;
      width: min(100%, 1100px);
      font-size: 0.95rem;
    }
    .count {
      color: #b4bec4;
      white-space: nowrap;
    }
    .ctl {
      position: fixed;
      display: grid;
      place-items: center;
      width: 48px;
      height: 48px;
      border: 1.5px solid rgba(243, 245, 244, 0.5);
      border-radius: var(--radius);
      background: rgba(22, 27, 31, 0.6);
      color: var(--snow);
      --icon: 22px;
      transition:
        background 0.15s,
        border-color 0.15s;
    }
    .ctl:hover {
      background: var(--timber);
      border-color: var(--timber);
    }
    .close {
      top: 12px;
      right: 12px;
    }
    .prev {
      left: 12px;
      top: 50%;
      translate: 0 -50%;
    }
    .next {
      right: 12px;
      top: 50%;
      translate: 0 -50%;
    }
    @media (max-width: 700px) {
      .prev,
      .next {
        top: auto;
        bottom: 12px;
        translate: none;
      }
      figure {
        padding-bottom: 76px;
      }
    }
    @keyframes fade {
      from {
        opacity: 0;
      }
    }
    @keyframes rise {
      from {
        transform: scale(0.97);
      }
    }
  `,
})
export class Lightbox {
  protected readonly api = inject(Api);
  protected readonly i18n = inject(I18n);

  readonly photos = input.required<Photo[]>();
  /** Total number of photos when `photos` is only the loaded part of a longer list. */
  readonly total = input<number | null>(null);
  /** Index of the open photo, or null when closed. */
  readonly index = model<number | null>(null);
  /** Fired when the viewer gets close to the end of the loaded photos. */
  readonly nearEnd = output<void>();

  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private touchX = 0;

  protected readonly current = computed(() => {
    const i = this.index();
    return i === null ? null : (this.photos()[i] ?? null);
  });
  protected readonly counter = computed(() =>
    this.i18n.fill(this.i18n.t().common.photoOf, {
      n: (this.index() ?? 0) + 1,
      total: this.total() ?? this.photos().length,
    }),
  );

  constructor() {
    effect(() => {
      const el = this.dialog().nativeElement;
      const open = this.index() !== null;
      if (open && !el.open) el.showModal();
      if (!open && el.open) el.close();
    });
  }

  protected url(photo: Photo): string {
    return this.api.photoUrl(photo, photo.widths[photo.widths.length - 1]);
  }

  protected close(): void {
    this.index.set(null);
  }

  protected step(delta: number): void {
    const i = this.index();
    const n = this.photos().length;
    if (i === null || n === 0) return;
    this.index.set((i + delta + n) % n);
    if (i + delta >= n - 3) this.nearEnd.emit();
  }

  protected key(event: KeyboardEvent): void {
    if (event.key === 'ArrowRight') this.step(1);
    if (event.key === 'ArrowLeft') this.step(-1);
  }

  protected backdrop(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (target === this.dialog().nativeElement || target.tagName === 'FIGURE') this.close();
  }

  protected touchStart(event: TouchEvent): void {
    this.touchX = event.changedTouches[0].clientX;
  }

  protected touchEnd(event: TouchEvent): void {
    const dx = event.changedTouches[0].clientX - this.touchX;
    if (Math.abs(dx) > 50) this.step(dx < 0 ? 1 : -1);
  }
}
