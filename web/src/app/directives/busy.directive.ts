import { Directive, ElementRef, computed, inject, input, signal } from '@angular/core';

/** The button with `rcBusy` that was pressed last, anywhere on the page. */
const pressed = signal<HTMLElement | null>(null);

/**
 * A button that waits for the API. While `rcBusy` it cannot be pressed, and the one that was
 * pressed becomes a progress button: a turning ring takes the place of its label and its size
 * stays (`.is-busy` in the global stylesheet). Buttons that share one busy state are all
 * disabled, but only the pressed one shows the ring.
 */
@Directive({
  selector: 'button[rcBusy]',
  host: {
    '[disabled]': 'rcBusy() || disabled()',
    '[class.is-busy]': 'running()',
    '[attr.aria-busy]': "running() ? 'true' : null",
    '(click)': 'press()',
  },
})
export class BusyDirective {
  /** The request this button belongs to is running. */
  readonly rcBusy = input.required<boolean>();
  /** Disables the button for a reason of its own. */
  readonly disabled = input(false);

  protected readonly running = computed(() => this.rcBusy() && pressed() === this.button);

  private readonly button = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  protected press(): void {
    pressed.set(this.button);
  }
}
