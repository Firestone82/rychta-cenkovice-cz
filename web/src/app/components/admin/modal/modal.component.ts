import type { ElementRef } from '@angular/core';
import {
  ChangeDetectionStrategy,
  Component,
  afterNextRender,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import { IconComponent } from '@components/icon/icon.component';
import { I18nService } from '@services/i18n.service';

let seq = 0;

/**
 * A window over the page, built on the native <dialog>: focus stays inside, Escape closes it.
 * It is open for as long as it is rendered, so the parent shows it with `@if`. The content goes
 * in as is; elements marked `modalActions` form the row of buttons at the bottom.
 */
@Component({
  selector: 'rc-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  templateUrl: './modal.component.html',
  styleUrl: './modal.component.scss',
})
export class ModalComponent {
  /** Heading of the window. */
  readonly heading = input.required<string>();
  /** Width of the window: `small` for a question, `wide` for a form. */
  readonly size = input<'small' | 'wide'>('small');
  /** The owner closed the window with Escape, the cross or a click outside. */
  readonly closed = output<void>();

  protected readonly t = inject(I18nService).t;
  protected readonly id = `modal-${++seq}`;
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  constructor() {
    afterNextRender(() => this.dialog().nativeElement.showModal());
  }

  /** Escape is reported instead of obeyed, so the parent stays the one who decides. */
  protected cancel(event: Event): void {
    event.preventDefault();
    this.closed.emit();
  }

  protected backdrop(event: MouseEvent): void {
    if (event.target === this.dialog().nativeElement) this.closed.emit();
  }
}
