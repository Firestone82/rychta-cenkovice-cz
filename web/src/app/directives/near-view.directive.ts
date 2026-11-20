import {
  DestroyRef,
  Directive,
  ElementRef,
  afterNextRender,
  inject,
  input,
  output,
} from '@angular/core';

/** Reports when the host element comes close to the viewport, e.g. to load the next page. */
@Directive({ selector: '[rcNearView]' })
export class NearViewDirective {
  /** How far outside the viewport the element already counts as near, as a CSS margin. */
  readonly margin = input('900px 0px', { alias: 'rcNearViewMargin' });
  /** Emits every time the element enters the extended viewport. */
  readonly near = output<void>({ alias: 'rcNearView' });

  constructor() {
    const host = inject<ElementRef<HTMLElement>>(ElementRef);
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const observer = new IntersectionObserver(
        (entries) => entries.some((e) => e.isIntersecting) && this.near.emit(),
        { rootMargin: this.margin() },
      );
      observer.observe(host.nativeElement);
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }
}
