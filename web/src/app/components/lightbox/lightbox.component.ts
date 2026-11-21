import type { ElementRef } from '@angular/core';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  model,
  output,
  viewChild,
} from '@angular/core';
import { I18nService } from '@services/i18n.service';
import type { Slide } from '@models/slide.model';
import { IconComponent } from '@components/icon/icon.component';

/**
 * Full-screen picture viewer built on the native <dialog>, which gives focus trapping,
 * Escape to close and the inert background for free. Arrow keys and swipes change the picture.
 */
@Component({
  selector: 'rc-lightbox',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  templateUrl: './lightbox.component.html',
  styleUrl: './lightbox.component.scss',
})
export class LightboxComponent {
  protected readonly i18n = inject(I18nService);

  /** Pictures that can be paged through. */
  readonly slides = input.required<Slide[]>();
  /** Total number of pictures when `slides` is only the loaded part of a longer list. */
  readonly total = input<number | null>(null);
  /** Index of the open picture, or null when closed. */
  readonly index = model<number | null>(null);
  /** Fired when the viewer gets close to the end of the loaded pictures. */
  readonly nearEnd = output<void>();

  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private touchX = 0;

  protected readonly current = computed(() => {
    const i = this.index();
    return i === null ? null : (this.slides()[i] ?? null);
  });
  protected readonly counter = computed(() =>
    this.i18n.fill(this.i18n.t().common.photoOf, {
      n: (this.index() ?? 0) + 1,
      total: this.total() ?? this.slides().length,
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

  protected close(): void {
    this.index.set(null);
  }

  protected step(delta: number): void {
    const i = this.index();
    const n = this.slides().length;
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
