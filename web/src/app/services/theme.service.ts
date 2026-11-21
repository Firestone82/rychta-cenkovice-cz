import { DOCUMENT } from '@angular/common';
import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { readStored, writeStored } from '@utils/storage.util';
import { filter, map } from 'rxjs';
import { ConsentService } from './consent.service';

export const THEMES = ['light', 'dark'] as const;
export type Theme = (typeof THEMES)[number];

const SITE_KEY = 'rc_theme';
const ADMIN_KEY = 'rc_admin_theme';

/**
 * Light or dark look. The website and the administration each keep their own choice, as
 * they do with the language: the website is light until a visitor switches and remembers
 * that only with consent to preferences; the administration follows the system at first.
 * `public/theme.js` applies the stored choice before the first paint.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly consent = inject(ConsentService);
  private readonly router = inject(Router);
  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );
  private readonly site = signal<Theme>(stored(SITE_KEY) ?? 'light');
  private readonly admin = signal<Theme>(stored(ADMIN_KEY) ?? system());

  /** The sign-in page stands outside both and stays light. */
  private readonly area = computed(() => {
    const path = this.url().split(/[?#]/)[0];
    if (!path.startsWith('/admin')) return 'site';
    return path.startsWith('/admin/login') ? null : 'admin';
  });

  /** Theme of the part of the site that is on screen. */
  readonly theme = computed<Theme>(() => {
    const area = this.area();
    return area === 'site' ? this.site() : area === 'admin' ? this.admin() : 'light';
  });

  constructor() {
    const root = inject(DOCUMENT).documentElement;
    effect(() => root.setAttribute('data-theme', this.theme()));
    // Without consent to preferences the choice of the website lasts for the visit only.
    effect(() => {
      if (this.consent.preferences()) writeStored(SITE_KEY, this.site());
      else forget(SITE_KEY);
    });
  }

  use(theme: Theme): void {
    if (this.area() === 'admin') {
      this.admin.set(theme);
      writeStored(ADMIN_KEY, theme);
    } else {
      this.site.set(theme);
    }
  }
}

function stored(key: string): Theme | null {
  const value = readStored<unknown>(key, null);
  return value === 'light' || value === 'dark' ? value : null;
}

function system(): Theme {
  return typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

function forget(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* nothing was stored */
  }
}
