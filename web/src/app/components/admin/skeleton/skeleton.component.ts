import type { ElementRef } from '@angular/core';
import {
  ChangeDetectionStrategy,
  Component,
  afterEveryRender,
  input,
  viewChild,
} from '@angular/core';

/**
 * Text that is the same for any data stays readable: table heads, field labels and whatever a
 * template marks with `data-static`. Form controls draw themselves.
 */
const KEPT =
  '[data-static], thead, .field > label, .field > .label, legend, .check, select, textarea';

/**
 * Loading state of an admin page. The page puts the real components inside, filled with
 * placeholder data, and they are drawn as grey shapes: every text becomes a bar of its own
 * size, so the shapes always have the layout of the content that replaces them.
 * The content must not change its structure while it is shown, only disappear as a whole.
 */
@Component({
  selector: 'rc-admin-skeleton',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { role: 'status' },
  templateUrl: './skeleton.component.html',
  styleUrl: './skeleton.component.scss',
})
export class SkeletonComponent {
  /** What is being loaded; announced to screen readers. */
  readonly label = input.required<string>();

  private readonly content = viewChild.required<ElementRef<HTMLElement>>('content');

  constructor() {
    afterEveryRender({ write: () => this.cover() });
  }

  /** Wraps each piece of text in a bar; the look of the bars is in the admin stylesheet. */
  private cover(): void {
    const walker = document.createTreeWalker(this.content().nativeElement, NodeFilter.SHOW_TEXT);
    const texts: Text[] = [];
    while (walker.nextNode()) {
      const text = walker.currentNode as Text;
      const parent = text.parentElement;
      if (text.data.trim() && parent && !parent.closest(`.sk-text, ${KEPT}`)) texts.push(text);
    }
    for (const text of texts) {
      const bar = document.createElement('span');
      bar.className = 'sk-text';
      text.replaceWith(bar);
      bar.append(text);
    }
  }
}
