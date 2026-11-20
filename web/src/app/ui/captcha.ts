import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  effect,
  inject,
  input,
  model,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { Api } from '../core/api';
import { Consent } from '../core/consent';
import { I18n } from '../core/i18n/i18n';
import { Spinner } from './spinner';

/** The part of the hCaptcha script this component uses. */
interface HCaptcha {
  render(
    container: HTMLElement,
    options: {
      sitekey: string;
      hl?: string;
      callback: (token: string) => void;
      'expired-callback': () => void;
      'chalexpired-callback': () => void;
      'error-callback': (code: string) => void;
    },
  ): string;
  reset(id?: string): void;
  remove(id?: string): void;
}

const SCRIPT = 'https://js.hcaptcha.com/1/api.js?render=explicit&recaptchacompat=off';
let loading: Promise<HCaptcha> | null = null;

/** Loads the hCaptcha script once, and only when a form needs it. */
function loadHCaptcha(): Promise<HCaptcha> {
  const ready = () => (window as unknown as { hcaptcha?: HCaptcha }).hcaptcha;
  loading ??= new Promise<HCaptcha>((resolve, reject) => {
    const present = ready();
    if (present) return resolve(present);
    const script = document.createElement('script');
    script.src = SCRIPT;
    script.async = true;
    script.onload = () => {
      const api = ready();
      if (api) resolve(api);
      else reject(new Error('hCaptcha did not start'));
    };
    script.onerror = () => {
      script.remove();
      reject(new Error('hCaptcha could not be loaded'));
    };
    document.head.append(script);
  }).catch((err: unknown) => {
    loading = null; // let the visitor try again
    throw err;
  });
  return loading;
}

/**
 * hCaptcha check for a public form. It shows nothing when the API has no hCaptcha keys.
 * The script comes from hCaptcha's servers, so it is loaded only after the visitor
 * allowed it, either in the cookie settings or with the button shown here.
 */
@Component({
  selector: 'rc-captcha',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Spinner],
  template: `
    @if (siteKey()) {
      <div
        class="box"
        role="group"
        tabindex="-1"
        [attr.aria-label]="t().captcha.label"
        [attr.aria-describedby]="key() + '-msg'"
        [attr.data-invalid]="error() ? '' : null"
        [id]="key()"
      >
        @if (!consent.external()) {
          <p class="ask">{{ t().captcha.askText }}</p>
          <button type="button" class="btn btn-ghost btn-small" (click)="consent.allowExternal()">
            {{ t().captcha.allow }}
          </button>
        } @else {
          @if (state() === 'loading') {
            <rc-spinner class="wait" [label]="t().captcha.loading" />
          }
          @if (state() === 'failed') {
            <p class="ask">{{ t().captcha.loadFailed }}</p>
            <button type="button" class="btn btn-ghost btn-small" (click)="start()">
              {{ t().captcha.retry }}
            </button>
          }
          <div class="widget" #widget [hidden]="state() !== 'ready'"></div>
        }
      </div>
      <p [id]="key() + '-msg'" class="error">{{ error() }}</p>
    }
  `,
  styles: `
    :host {
      display: block;
      width: 100%;
    }
    :host:empty {
      display: none;
    }
    .box {
      display: grid;
      gap: 12px;
      justify-items: start;
      outline-offset: 4px;
    }
    .box:has(.ask),
    .box:has(.wait) {
      padding: 14px 16px;
      border: 1px solid var(--edge);
      border-radius: var(--radius);
      background: var(--snow);
    }
    .box[data-invalid]:has(.ask) {
      border-color: var(--timber);
      box-shadow: inset 4px 0 0 var(--timber);
    }
    .ask,
    .wait {
      font-size: 0.95rem;
      max-width: 62ch;
    }
    .wait {
      --spinner: 30px;
    }
    .widget {
      min-height: 78px;
      max-width: 100%;
      overflow-x: auto;
    }
    .error {
      margin-top: 6px;
      font-size: 0.9rem;
      font-weight: 700;
      color: var(--timber);
    }
    .error:empty {
      display: none;
    }
  `,
})
export class Captcha {
  /** Id of the group on the page (the host element keeps none). */
  readonly key = input('captcha');
  readonly error = input<string | null | undefined>(null);
  /** The solved answer to send with the form; empty until solved and after it expires. */
  readonly token = model('');

  protected readonly consent = inject(Consent);
  protected readonly t = inject(I18n).t;
  private readonly i18n = inject(I18n);
  private readonly api = inject(Api);

  protected readonly siteKey = signal('');
  protected readonly state = signal<'idle' | 'loading' | 'ready' | 'failed'>('idle');
  private readonly host = viewChild<ElementRef<HTMLElement>>('widget');
  private hcaptcha: HCaptcha | null = null;
  private widgetId: string | null = null;
  private destroyed = false;

  constructor() {
    void this.loadConfig();
    // Render the widget once its place is on the page, take it away when consent is withdrawn.
    effect(() => {
      const el = this.host()?.nativeElement;
      const allowed = this.consent.external();
      untracked(() => {
        if (el && allowed && this.state() === 'idle') void this.start();
        if (!allowed) this.drop();
      });
    });
    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true;
      this.removeWidget();
    });
  }

  /** True when the form must not be sent without an answer. */
  needed(): boolean {
    return this.siteKey() !== '';
  }

  /** An answer can be used once: ask for a new one after the server has seen it. */
  reset(): void {
    this.token.set('');
    if (!this.needed()) void this.loadConfig();
    else if (this.widgetId !== null) this.hcaptcha?.reset(this.widgetId);
  }

  private async loadConfig(): Promise<void> {
    try {
      this.siteKey.set((await this.api.config()).hcaptcha_sitekey ?? '');
    } catch {
      /* the API is out of reach; sending the form will say so */
    }
  }

  protected async start(): Promise<void> {
    this.state.set('loading');
    try {
      const hcaptcha = await loadHCaptcha();
      const el = this.host()?.nativeElement;
      if (this.destroyed || !el || !this.consent.external()) {
        this.state.set('idle');
        return;
      }
      this.hcaptcha = hcaptcha;
      this.widgetId = hcaptcha.render(el, {
        sitekey: this.siteKey(),
        hl: this.i18n.lang(),
        callback: (token) => this.token.set(token),
        'expired-callback': () => this.token.set(''),
        'chalexpired-callback': () => this.token.set(''),
        'error-callback': () => this.token.set(''),
      });
      this.state.set('ready');
    } catch {
      if (!this.destroyed) this.state.set('failed');
    }
  }

  private removeWidget(): void {
    if (this.widgetId !== null) {
      try {
        this.hcaptcha?.remove(this.widgetId);
      } catch {
        /* already gone */
      }
    }
    this.widgetId = null;
  }

  private drop(): void {
    this.removeWidget();
    if (this.token()) this.token.set('');
    if (this.state() !== 'idle') this.state.set('idle');
  }
}
