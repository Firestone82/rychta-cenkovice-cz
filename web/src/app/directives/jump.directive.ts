import { Location } from '@angular/common';
import { Directive, inject, input } from '@angular/core';
import { Router } from '@angular/router';

/**
 * Makes a link glide to an element of the same page. The router would treat the fragment as
 * a navigation, with the cross-fade of a page change, and land there in one step.
 */
@Directive({
  selector: 'a[rcJump]',
  host: { '[attr.href]': 'href()', '(click)': 'go($event)' },
})
export class JumpDirective {
  /** Id of the element to scroll to. */
  readonly rcJump = input.required<string>();

  private readonly router = inject(Router);
  private readonly location = inject(Location);

  protected href(): string {
    return `${this.router.url.split('#')[0]}#${this.rcJump()}`;
  }

  protected go(event: MouseEvent): void {
    // A new tab or window gets the plain link.
    if (event.ctrlKey || event.metaKey || event.shiftKey) return;
    event.preventDefault();
    const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
    document
      .getElementById(this.rcJump())
      ?.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'start' });
    this.location.replaceState(this.href());
  }
}
