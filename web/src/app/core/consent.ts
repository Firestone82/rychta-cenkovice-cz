import { Injectable, signal } from '@angular/core';

const KEY = 'rc-consent';

export interface ConsentChoice {
  /** Remember the chosen language. */
  preferences: boolean;
  /** Load hCaptcha (a service of another company) on the forms. */
  external: boolean;
}

/**
 * What the visitor allowed the website to keep in the browser. Nothing optional is
 * stored or loaded before a choice is made; the choice itself counts as necessary.
 */
@Injectable({ providedIn: 'root' })
export class Consent {
  /** False until the visitor has chosen: the cookie bar is shown. */
  readonly decided = signal(false);
  readonly preferences = signal(false);
  readonly external = signal(false);
  /** The settings dialog. Opened from the bar, the footer and the privacy page. */
  readonly settingsOpen = signal(false);

  constructor() {
    try {
      const saved: unknown = JSON.parse(localStorage.getItem(KEY) ?? 'null');
      if (saved && typeof saved === 'object') {
        const s = saved as Partial<ConsentChoice>;
        this.preferences.set(s.preferences === true);
        this.external.set(s.external === true);
        this.decided.set(true);
      }
    } catch {
      /* no storage or a damaged value: ask again */
    }
  }

  save(choice: ConsentChoice): void {
    this.preferences.set(choice.preferences);
    this.external.set(choice.external);
    this.decided.set(true);
    try {
      localStorage.setItem(KEY, JSON.stringify({ ...choice, at: new Date().toISOString() }));
    } catch {
      /* private mode: the choice holds until the page is closed */
    }
  }

  acceptAll(): void {
    this.save({ preferences: true, external: true });
  }

  necessaryOnly(): void {
    this.save({ preferences: false, external: false });
  }

  /** Given right at a form: allows hCaptcha and leaves the rest as it is. */
  allowExternal(): void {
    this.save({ preferences: this.preferences(), external: true });
  }
}
