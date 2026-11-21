import { Injectable, signal } from '@angular/core';
import { readStored, writeStored } from '@utils/storage.util';

export const ADMIN_THEMES = ['light', 'dark'] as const;
export type AdminTheme = (typeof ADMIN_THEMES)[number];

const KEY = 'rc_admin_theme';

/** Light or dark look of the administration; follows the system until one is chosen. */
@Injectable({ providedIn: 'root' })
export class AdminThemeService {
  readonly theme = signal<AdminTheme>(initial());

  use(theme: AdminTheme): void {
    this.theme.set(theme);
    writeStored(KEY, theme);
  }
}

function initial(): AdminTheme {
  const stored = readStored<string | null>(KEY, null);
  if (stored === 'light' || stored === 'dark') return stored;
  return typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}
