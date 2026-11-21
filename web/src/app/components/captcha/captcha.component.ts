import type { ElementRef } from '@angular/core';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  model,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { SpinnerComponent } from '@components/spinner/spinner.component';
import { ApiService } from '@services/api.service';
import { ConsentService } from '@services/consent.service';
import { I18nService } from '@services/i18n.service';
import { type HCaptcha, loadHCaptcha } from '@utils/hcaptcha.util';

/**
 * hCaptcha check for a public form. It shows nothing when the API has no hCaptcha keys.
 * The script comes from hCaptcha's servers, so it is loaded only after the visitor
 * allowed it, either in the cookie settings or with the button shown here.
 */
@Component({
  selector: 'rc-captcha',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SpinnerComponent],
  templateUrl: './captcha.component.html',
  styleUrl: './captcha.component.scss',
})
export class CaptchaComponent {
  /** Id of the group on the page (the host element keeps none). */
  readonly key = input('captcha');
  /** Validation message shown under the widget. */
  readonly error = input<string | null | undefined>(null);
  /** The solved answer to send with the form; empty until solved and after it expires. */
  readonly token = model('');

  protected readonly consent = inject(ConsentService);
  protected readonly t = inject(I18nService).t;
  private readonly i18n = inject(I18nService);
  private readonly api = inject(ApiService);

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
