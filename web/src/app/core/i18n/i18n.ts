import { Injectable, computed, signal } from '@angular/core';
import type { Dict, Lang, Plural } from './types';

const STORAGE_KEY = 'rc-lang';

export function isLang(value: unknown): value is Lang {
  return value === 'cs' || value === 'en';
}

/**
 * Runtime translations. Each language is its own lazy chunk; `t()` returns the whole
 * typed dictionary, so templates read `t().nav.home` and the compiler checks every key.
 */
@Injectable({ providedIn: 'root' })
export class I18n {
  private readonly cache: Partial<Record<Lang, Dict>> = {};
  private readonly dict = signal<Dict | null>(null);

  readonly lang = signal<Lang>('cs');
  readonly t = computed(() => {
    const d = this.dict();
    if (!d) throw new Error('I18n: no language loaded yet');
    return d;
  });
  readonly locale = computed(() => this.t().locale);

  /** Loads (once) and activates a language. Used as a route resolver. */
  async use(lang: Lang): Promise<void> {
    if (!this.cache[lang]) {
      this.cache[lang] = lang === 'cs' ? (await import('./cs')).cs : (await import('./en')).en;
    }
    this.dict.set(this.cache[lang]!);
    this.lang.set(lang);
    document.documentElement.lang = lang;
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      /* private mode: the preference just is not remembered */
    }
  }

  /** The language to start with: the remembered one, else the browser's, else Czech. */
  preferred(): Lang {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (isLang(saved)) return saved;
    } catch {
      /* ignore */
    }
    const browser = (navigator.languages?.[0] ?? navigator.language ?? 'cs').toLowerCase();
    return browser.startsWith('cs') || browser.startsWith('sk') ? 'cs' : 'en';
  }

  /** Picks the current language from a bilingual API value, falling back to Czech. */
  pick(value: { cs: string; en: string } | null | undefined): string {
    if (!value) return '';
    return this.lang() === 'en' && value.en ? value.en : value.cs;
  }

  pickList(value: { cs: string[]; en: string[] } | null | undefined): string[] {
    if (!value) return [];
    return this.lang() === 'en' && value.en?.length ? value.en : value.cs;
  }

  /** "3 noci" / "5 nocí" / "1 night". */
  count(n: number, forms: Plural): string {
    return `${this.number(n)} ${this.form(n, forms)}`;
  }

  form(n: number, forms: Plural): string {
    const rule = new Intl.PluralRules(this.locale()).select(n);
    if (rule === 'one') return forms.one;
    if (rule === 'few' && forms.few) return forms.few;
    return forms.other;
  }

  /** Replaces {name} placeholders. */
  fill(template: string, values: Record<string, string | number>): string {
    return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ''));
  }

  number(n: number, digits = 0): string {
    return new Intl.NumberFormat(this.locale(), {
      maximumFractionDigits: 1,
      minimumFractionDigits: digits,
    }).format(n);
  }

  money(czk: number): string {
    return new Intl.NumberFormat(this.locale(), {
      style: 'currency',
      currency: 'CZK',
      maximumFractionDigits: 0,
    }).format(czk);
  }

  /** Formats an ISO date (YYYY-MM-DD) without time-zone drift. */
  date(iso: string, style: 'short' | 'long' | 'weekday' | 'month' = 'short'): string {
    const [y, m, d] = iso.split('-').map(Number);
    const date = new Date(Date.UTC(y, (m || 1) - 1, d || 1));
    const options: Intl.DateTimeFormatOptions =
      style === 'long'
        ? { day: 'numeric', month: 'long', year: 'numeric' }
        : style === 'weekday'
          ? { weekday: 'short', day: 'numeric', month: 'numeric' }
          : style === 'month'
            ? { month: 'long', year: 'numeric' }
            : { day: 'numeric', month: 'numeric', year: 'numeric' };
    return new Intl.DateTimeFormat(this.locale(), { ...options, timeZone: 'UTC' }).format(date);
  }

  dateTime(isoTimestamp: string): string {
    const date = new Date(isoTimestamp);
    if (Number.isNaN(date.getTime())) return isoTimestamp;
    return new Intl.DateTimeFormat(this.locale(), {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }

  range(from: string, to: string): string {
    return `${this.date(from)} – ${this.date(to)}`;
  }
}
