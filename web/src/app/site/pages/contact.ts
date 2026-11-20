import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Api, toFailure } from '../../core/api';
import { CONTACT } from '../../core/config';
import { checkedOf, fieldMessage, isEmail, isPhone, valueOf } from '../../core/forms';
import { I18n } from '../../core/i18n/i18n';
import { Links } from '../../core/links';
import { Seo } from '../../core/seo';
import { Captcha } from '../../ui/captcha';
import { Field } from '../../ui/field';
import { Icon } from '../../ui/icon';

@Component({
  selector: 'rc-contact',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Icon, Field, Captcha],
  template: `
    <header class="wrap page-head">
      <h1 class="h1">{{ t().contact.title }}</h1>
      <p class="lead">{{ t().contact.lead }}</p>
    </header>

    <div class="wrap grid">
      <div class="reach">
        <section>
          <h2 class="label">{{ t().contact.call }}</h2>
          <a class="phone num" [href]="contact.phoneHref">{{ contact.phone }}</a>
        </section>
        <section>
          <h2 class="label">{{ t().contact.write }}</h2>
          <a class="mail" [href]="'mailto:' + contact.email">{{ contact.email }}</a>
        </section>
        <section>
          <h2 class="label">{{ t().contact.visit }}</h2>
          <address>
            <strong>{{ t().meta.site }}</strong>
            @for (line of t().contact.address; track line) {
              <span>{{ line }}</span>
            }
          </address>
          <ul class="maps">
            <li>
              <a class="ext" [href]="contact.mapSeznam" target="_blank" rel="noopener">
                <rc-icon name="pin" /> {{ t().contact.mapSeznam }}
                <span class="sr-only">({{ t().common.newTab }})</span>
              </a>
            </li>
            <li>
              <a class="ext" [href]="contact.mapGoogle" target="_blank" rel="noopener">
                <rc-icon name="pin" /> {{ t().contact.mapGoogle }}
                <span class="sr-only">({{ t().common.newTab }})</span>
              </a>
            </li>
            <li>
              <a class="ext" [href]="contact.facebook" target="_blank" rel="noopener">
                <rc-icon name="facebook" /> {{ t().contact.facebook }}
                <span class="sr-only">({{ t().common.newTab }})</span>
              </a>
            </li>
          </ul>
        </section>
      </div>

      <section class="form-box" aria-labelledby="contact-form-title">
        @if (sent()) {
          <div class="done" role="status" tabindex="-1" #done>
            <svg viewBox="0 0 64 48" aria-hidden="true" focusable="false">
              <path d="M6 44V22L32 4l26 18v22" />
              <path class="tick" d="m22 30 8 8 14-16" />
            </svg>
            <h2 class="h2">{{ t().contact.sentTitle }}</h2>
            <p>{{ t().contact.sentText }}</p>
            <button type="button" class="btn btn-ghost" (click)="again()">
              {{ t().contact.sendAnother }}
            </button>
          </div>
        } @else {
          <h2 id="contact-form-title" class="h2">{{ t().contact.formTitle }}</h2>
          <p class="hint-line muted">
            {{ t().contact.bookingHint }}
            <a [routerLink]="links.to('booking')">{{ t().contact.bookingHintLink }}</a>.
          </p>
          <form (submit)="submit($event)" novalidate>
            <div class="form-grid">
              <rc-field
                for="c-name"
                [label]="t().contact.name"
                [error]="errors()['name']"
                class="wide"
              >
                <input
                  id="c-name"
                  class="input"
                  type="text"
                  autocomplete="name"
                  required
                  [value]="name()"
                  (input)="name.set(value($event))"
                  [attr.aria-invalid]="errors()['name'] ? 'true' : null"
                  aria-describedby="c-name-msg"
                />
              </rc-field>
              <rc-field for="c-email" [label]="t().contact.email" [error]="errors()['email']">
                <input
                  id="c-email"
                  class="input"
                  type="email"
                  autocomplete="email"
                  required
                  [value]="email()"
                  (input)="email.set(value($event))"
                  [attr.aria-invalid]="errors()['email'] ? 'true' : null"
                  aria-describedby="c-email-msg"
                />
              </rc-field>
              <rc-field
                for="c-phone"
                [label]="t().contact.phone"
                [optional]="t().common.optional"
                [error]="errors()['phone']"
              >
                <input
                  id="c-phone"
                  class="input"
                  type="tel"
                  autocomplete="tel"
                  [value]="phone()"
                  (input)="phone.set(value($event))"
                  [attr.aria-invalid]="errors()['phone'] ? 'true' : null"
                  aria-describedby="c-phone-msg"
                />
              </rc-field>
              <rc-field
                for="c-message"
                [label]="t().contact.message"
                [error]="errors()['message']"
                class="wide"
              >
                <textarea
                  id="c-message"
                  class="input"
                  rows="6"
                  required
                  [value]="message()"
                  (input)="message.set(value($event))"
                  [attr.aria-invalid]="errors()['message'] ? 'true' : null"
                  aria-describedby="c-message-msg"
                ></textarea>
              </rc-field>
            </div>

            <div class="hp" aria-hidden="true">
              <label for="c-website">Website</label>
              <input
                id="c-website"
                type="text"
                tabindex="-1"
                autocomplete="off"
                [value]="website()"
                (input)="website.set(value($event))"
              />
            </div>

            <div class="consent">
              <label class="check">
                <input
                  type="checkbox"
                  [checked]="consent()"
                  (change)="consent.set(checked($event))"
                  [attr.aria-invalid]="errors()['consent'] ? 'true' : null"
                  aria-describedby="c-consent-msg"
                />
                <span>
                  {{ t().contact.consent }}
                  <a [routerLink]="links.to('privacy')" target="_blank">{{
                    t().booking.consentLink
                  }}</a>
                </span>
              </label>
              <p id="c-consent-msg" class="error">{{ errors()['consent'] }}</p>
            </div>

            <rc-captcha key="c-captcha" [(token)]="captchaToken" [error]="errors()['captcha']" />

            @if (failure()) {
              <p class="notice is-error" role="alert">{{ failure() }}</p>
            }

            <button class="btn" type="submit" [disabled]="sending()">
              <rc-icon name="mail" /> {{ sending() ? t().contact.submitting : t().contact.submit }}
            </button>
          </form>
        }
      </section>
    </div>
  `,
  styles: `
    .grid {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      gap: 48px clamp(32px, 6vw, 96px);
      align-items: start;
      padding-bottom: var(--section);
    }
    .reach {
      display: grid;
      gap: clamp(28px, 4vw, 44px);
    }
    .label {
      font-size: 0.95rem;
      font-weight: 700;
      color: var(--slate-2);
    }
    .phone {
      display: inline-block;
      font-size: clamp(3rem, 6.6vw, 5.6rem);
      line-height: 0.95;
      text-decoration: none;
    }
    .phone:hover {
      color: var(--timber);
    }
    .mail {
      font-size: clamp(1.25rem, 2.2vw, 1.7rem);
      font-weight: 700;
      overflow-wrap: anywhere;
      text-underline-offset: 5px;
    }
    address {
      display: grid;
      font-style: normal;
      font-size: 1.15rem;
      margin-top: 2px;
    }
    .maps {
      display: grid;
      gap: 8px;
      margin-top: 16px;
    }
    .ext {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-weight: 700;
    }
    .form-box {
      padding: clamp(22px, 3.5vw, 44px);
      background: var(--white);
      border-top: 6px solid var(--timber);
    }
    .hint-line {
      margin: 10px 0 24px;
    }
    form {
      display: grid;
      gap: 20px;
      justify-items: start;
    }
    .form-grid,
    .consent {
      width: 100%;
    }
    .consent .error {
      margin-top: 6px;
      font-size: 0.9rem;
      font-weight: 700;
      color: var(--timber);
    }
    .consent .error:empty {
      display: none;
    }
    .done {
      display: grid;
      gap: 14px;
      justify-items: start;
      outline: none;
    }
    .done svg {
      width: 72px;
      fill: none;
      stroke: var(--timber);
      stroke-width: 3.5;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    .done .tick {
      stroke: var(--spruce);
      stroke-dasharray: 40;
      stroke-dashoffset: 40;
      animation: tick 0.6s var(--ease) 0.25s forwards;
    }
    @keyframes tick {
      to {
        stroke-dashoffset: 0;
      }
    }
    @media (max-width: 900px) {
      .grid {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class ContactPage {
  protected readonly i18n = inject(I18n);
  protected readonly links = inject(Links);
  protected readonly t = this.i18n.t;
  protected readonly contact = CONTACT;
  private readonly api = inject(Api);

  protected readonly name = signal('');
  protected readonly email = signal('');
  protected readonly phone = signal('');
  protected readonly message = signal('');
  protected readonly consent = signal(false);
  protected readonly website = signal('');
  protected readonly captchaToken = signal('');
  private readonly captcha = viewChild(Captcha);

  protected readonly errors = signal<Record<string, string>>({});
  protected readonly failure = signal('');
  protected readonly sending = signal(false);
  protected readonly sent = signal(false);
  protected readonly value = valueOf;
  protected readonly checked = checkedOf;

  private readonly done = viewChild<ElementRef<HTMLElement>>('done');

  constructor() {
    inject(Seo).page(this.t().contact.title, this.t().contact.lead);
  }

  protected async submit(event: Event): Promise<void> {
    event.preventDefault();
    if (this.sending()) return;
    const codes: Record<string, string> = {};
    if (this.name().trim().length < 2) codes['name'] = 'required';
    if (!isEmail(this.email())) codes['email'] = 'invalid';
    if (this.phone().trim() && !isPhone(this.phone())) codes['phone'] = 'invalid';
    if (this.message().trim().length < 5) codes['message'] = 'required';
    if (!this.consent()) codes['consent'] = 'required';
    if (this.captcha()?.needed() && !this.captchaToken()) codes['captcha'] = 'required';
    if (this.show(codes, event.target as HTMLFormElement)) return;

    this.sending.set(true);
    this.failure.set('');
    try {
      await this.api.contact({
        name: this.name().trim(),
        email: this.email().trim(),
        phone: this.phone().trim(),
        message: this.message().trim(),
        consent: true,
        language: this.i18n.lang(),
        website: this.website(),
        captcha_token: this.captchaToken() || undefined,
      });
      this.sent.set(true);
      setTimeout(() => this.done()?.nativeElement.focus());
    } catch (err) {
      const failure = toFailure(err);
      // The server checks an answer once. Unless it stopped earlier, a new one is needed.
      const spent =
        failure.code === 'validation'
          ? 'captcha' in failure.fields
          : failure.status >= 400 && failure.status !== 429;
      if (spent) this.captcha()?.reset();
      if (
        failure.code === 'validation' &&
        this.show(failure.fields, event.target as HTMLFormElement)
      )
        return;
      const e = this.t().errors;
      this.failure.set(
        failure.status === 429
          ? e.rate_limited
          : failure.status === 0
            ? e.offline
            : failure.code === 'captcha_unavailable'
              ? e.captcha_unavailable
              : e.generic,
      );
    } finally {
      this.sending.set(false);
    }
  }

  /** Shows field errors and moves focus to the first one. Returns true when there are any. */
  private show(codes: Record<string, string>, form: HTMLFormElement): boolean {
    const messages: Record<string, string> = {};
    for (const [field, code] of Object.entries(codes))
      messages[field] = fieldMessage(this.t(), field, code);
    this.errors.set(messages);
    const first = Object.keys(codes)[0];
    if (!first) return false;
    this.failure.set(this.t().booking.fixErrors);
    setTimeout(() =>
      form.querySelector<HTMLElement>('[aria-invalid="true"], [data-invalid]')?.focus(),
    );
    return true;
  }

  protected again(): void {
    this.captchaToken.set('');
    this.message.set('');
    this.errors.set({});
    this.failure.set('');
    this.sent.set(false);
  }
}
