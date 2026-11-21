import type { OnDestroy } from '@angular/core';
import { Directive, ElementRef, afterNextRender, inject, input } from '@angular/core';

/** Fades an element in the first time it scrolls into view. One shared observer for the page. */
let observer: IntersectionObserver | null = null;

function shared(): IntersectionObserver {
  observer ??= new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          (entry.target as HTMLElement).dataset['reveal'] = 'in';
          observer!.unobserve(entry.target);
        }
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
  );
  return observer;
}

@Directive({
  selector: '[rcReveal]',
  host: { 'data-reveal': '', '[style.--reveal-delay]': 'delay() + "ms"' },
})
export class RevealDirective implements OnDestroy {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  /** Delay in milliseconds, for a short stagger within one group. */
  readonly delay = input(0, {
    alias: 'rcReveal',
    transform: (v: number | string) => Number(v) || 0,
  });

  constructor() {
    afterNextRender(() => {
      if (typeof IntersectionObserver === 'undefined') {
        this.el.nativeElement.dataset['reveal'] = 'in';
        return;
      }
      shared().observe(this.el.nativeElement);
    });
  }

  ngOnDestroy(): void {
    observer?.unobserve(this.el.nativeElement);
  }
}
