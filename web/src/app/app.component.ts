import { DOCUMENT, isPlatformServer } from '@angular/common';
import { ChangeDetectionStrategy, Component, PLATFORM_ID, inject, signal } from '@angular/core';
import {
  NavigationCancel,
  NavigationEnd,
  NavigationError,
  NavigationStart,
  Router,
  RouterOutlet,
} from '@angular/router';
import { ThemeService } from '@services/theme.service';
import { ToastOutletComponent } from './components/toast-outlet/toast-outlet.component';

@Component({
  selector: 'rc-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, ToastOutletComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  protected readonly navigating = signal(false);

  constructor() {
    inject(ThemeService);
    const doc = inject(DOCUMENT);
    // A page rendered on the server is complete, so it goes out without the loader.
    if (isPlatformServer(inject(PLATFORM_ID))) doc.getElementById('boot')?.remove();
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
          hideBootLoader(doc);
        }
      }
    });
  }
}

/** Fades out the loader that index.html shows until the first page is ready. */
function hideBootLoader(doc: Document): void {
  const boot = doc.getElementById('boot');
  if (!boot) return;
  requestAnimationFrame(() => {
    boot.classList.add('is-done');
    setTimeout(() => boot.remove(), 600);
  });
}
