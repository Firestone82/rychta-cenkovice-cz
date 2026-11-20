import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  NavigationCancel,
  NavigationEnd,
  NavigationError,
  NavigationStart,
  Router,
  RouterOutlet,
} from '@angular/router';
import { ToastOutlet } from './ui/toast';

@Component({
  selector: 'rc-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, ToastOutlet],
  template: `
    <div class="progress" [class.is-active]="navigating()" aria-hidden="true"></div>
    <router-outlet />
    <rc-toasts />
  `,
  styles: `
    /* Route loading bar: a roof-red line that only shows when a page takes a moment to load. */
    .progress {
      position: fixed;
      inset: 0 0 auto 0;
      z-index: 200;
      height: 3px;
      background: var(--timber);
      transform: scaleX(0);
      transform-origin: left;
      opacity: 0;
    }
    .progress.is-active {
      opacity: 1;
      animation: load 2.4s cubic-bezier(0.1, 0.6, 0.2, 1) forwards;
    }
    @keyframes load {
      to {
        transform: scaleX(0.92);
      }
    }
  `,
})
export class App {
  protected readonly navigating = signal(false);

  constructor() {
    const router = inject(Router);
    let timer: ReturnType<typeof setTimeout> | undefined;
    let booted = false;
    router.events.subscribe((event) => {
      if (event instanceof NavigationStart) {
        clearTimeout(timer);
        timer = setTimeout(() => this.navigating.set(true), 140);
      } else if (
        event instanceof NavigationEnd ||
        event instanceof NavigationCancel ||
        event instanceof NavigationError
      ) {
        clearTimeout(timer);
        this.navigating.set(false);
        if (!booted && !(event instanceof NavigationCancel)) {
          booted = true;
          hideBootLoader();
        }
      }
    });
  }
}

/** Fades out the loader that index.html shows until the first page is ready. */
function hideBootLoader(): void {
  const boot = document.getElementById('boot');
  if (!boot) return;
  requestAnimationFrame(() => {
    boot.classList.add('is-done');
    setTimeout(() => boot.remove(), 600);
  });
}
