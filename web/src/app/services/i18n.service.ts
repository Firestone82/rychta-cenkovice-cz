import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { ConsentService } from './consent.service';
import { DICTIONARIES } from '@config/languages.config';
import { SITE } from '@config/site.config';
import type { Dict, Lang, Plural } from '@models/i18n.model';

const STORAGE_KEY = 'rc-lang';
const ADMIN_KEY = 'rc-admin-lang';

export function isLang(value: unknown): value is Lang {
  return SITE.languages.some((l) => l.code === value);
}

/**
 * Runtime translations. Each language is its own lazy chunk; `t()` returns the whole
 * typed dictionary, so templates read `t().nav.home` and the compiler checks every key.
 */
@Injectable({ providedIn: 'root' })
export class I18nService {
  private readonly cache: Partial<Record<Lang, Dict>> = {};
  private readonly dict = signal<Dict | null>(null);

  readonly lang = signal<Lang>(SITE.defaultLanguage);
  readonly t = computed(() => {
    const d = this.dict();
    if (!d) throw new Error('I18n: no language loaded yet');
    return d;
  });
  readonly locale = computed(() => this.t().locale);

  private readonly consent = inject(ConsentService);

  constructor() {
    // The language is remembered only with the visitor's consent and forgotten without it.
    effect(() => {
      const allowed = this.consent.preferences();
      untracked(() => this.remember(allowed));
    });
  }

  private remember(allowed: boolean): void {
    try {
      if (allowed && this.dict()) localStorage.setItem(STORAGE_KEY, this.lang());
      else if (!allowed) localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* private mode: the preference just is not remembered */
    }
  }

  /** Loads (once) and activates a language. Used as a route resolver. */
  async use(lang: Lang): Promise<void> {
    this.cache[lang] ??= await DICTIONARIES[lang]();
    this.dict.set(this.cache[lang]);
    this.lang.set(lang);
    document.documentElement.lang = lang;
    this.remember(this.consent.preferences());
  }

  /** The language to start with: the remembered one, else the browser's, else Czech. */
  preferred(): Lang {
    try {
      const saved = this.consent.preferences() ? localStorage.getItem(STORAGE_KEY) : null;
      if (isLang(saved)) return saved;
    } catch {
      /* ignore */
    }
    const browser = (navigator.languages?.[0] ?? navigator.language ?? '').toLowerCase();
    const match = SITE.languages.find((l) =>
      l.browser.some((prefix) => browser.startsWith(prefix)),
    );
    return match?.code ?? SITE.fallbackLanguage;
  }

  /**
   * The language of the administration. The administrator sets it with the switch in the
   * sidebar; it belongs to the signed-in tool, so it is kept without the cookie settings.
   */
  adminPreferred(): Lang {
    try {
      const saved = localStorage.getItem(ADMIN_KEY);
      if (isLang(saved)) return saved;
    } catch {
      /* ignore */
    }
    return this.preferred();
  }

  async useInAdmin(lang: Lang): Promise<void> {
    await this.use(lang);
    try {
      localStorage.setItem(ADMIN_KEY, lang);
    } catch {
      /* ignore */
    }
  }

  /** Picks the current language from a bilingual API value, falling back to Czech. */
  pick(value: { cs: string; en: string } | null | undefined): string {
    if (!value) return '';
    return this.lang() === 'en' && value.en ? value.en : value.cs;
  }

  /** "Apartment 3", followed by the apartment's own name when it has one. */
  apartment(a: { number: number; name?: { cs: string; en: string } }): string {
    const title = `${this.t().common.apartment} ${a.number}`;
    const alias = this.pick(a.name);
    return alias ? `${title} – ${alias}` : title;
  }

  /** The name of a flat type from the fixed list, or nothing when it is not stated. */
  flatType(key: string | null | undefined): string {
    return key ? ((this.t().flatTypes as Record<string, string>)[key] ?? '') : '';
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
