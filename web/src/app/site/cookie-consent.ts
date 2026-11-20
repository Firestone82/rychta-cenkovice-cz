import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Api } from '../core/api';
import { Consent } from '../core/consent';
import { checkedOf } from '../core/forms';
import { I18n } from '../core/i18n/i18n';
import { Links } from '../core/links';
import { Icon } from '../ui/icon';
import { Toasts } from '../ui/toast';

/**
 * The cookie bar of a first visit and the settings dialog behind it. Refusing takes
 * one click, the same as allowing, and nothing optional is switched on beforehand.
 */
@Component({
  selector: 'rc-cookie-consent',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Icon],
  template: `
    @if (!consent.decided() && !consent.settingsOpen()) {
      <section class="bar" [attr.aria-label]="c().title">
        <p>
          {{ hasExternal() ? c().barText : c().barTextPlain }}
          <a [routerLink]="links.to('privacy')">{{ c().more }}</a>
        </p>
        <div class="actions">
          <button type="button" class="btn btn-small" id="cookies-accept" (click)="acceptAll()">
            {{ c().acceptAll }}
          </button>
          <button type="button" class="btn btn-small" id="cookies-necessary" (click)="necessary()">
            {{ c().onlyNecessary }}
          </button>
          <button
            type="button"
            class="btn btn-small btn-quiet"
            id="cookies-settings"
            (click)="consent.settingsOpen.set(true)"
          >
            {{ c().settings }}
          </button>
        </div>
      </section>
    }

    <dialog
      #dialog
      class="settings"
      aria-labelledby="cookie-settings-title"
      (close)="consent.settingsOpen.set(false)"
      (click)="backdrop($event)"
    >
      <form method="dialog" (submit)="save($event)">
        <header>
          <h2 id="cookie-settings-title" class="h3">{{ c().title }}</h2>
          <button type="button" class="x" (click)="close()">
            <rc-icon name="close" /><span class="sr-only">{{ t().common.close }}</span>
          </button>
        </header>
        <p class="intro">{{ c().intro }}</p>

        <ul class="kinds">
          <li>
            <label class="check">
              <input type="checkbox" checked disabled aria-describedby="ck-necessary" />
              <span>
                <strong>{{ c().necessary.name }}</strong>
                <em>{{ c().necessary.always }}</em>
                <span id="ck-necessary">{{ c().necessary.text }}</span>
              </span>
            </label>
          </li>
          <li>
            <label class="check">
              <input
                type="checkbox"
                id="ck-preferences-box"
                [checked]="preferences()"
                (change)="preferences.set(checked($event))"
                aria-describedby="ck-preferences"
              />
              <span>
                <strong>{{ c().preferences.name }}</strong>
                <span id="ck-preferences">{{ c().preferences.text }}</span>
              </span>
            </label>
          </li>
          @if (hasExternal()) {
            <li>
              <label class="check">
                <input
                  type="checkbox"
                  id="ck-external-box"
                  [checked]="external()"
                  (change)="external.set(checked($event))"
                  aria-describedby="ck-external"
                />
                <span>
                  <strong>{{ c().external.name }}</strong>
                  <span id="ck-external">{{ c().external.text }}</span>
                </span>
              </label>
            </li>
          }
        </ul>

        <footer>
          <button type="submit" class="btn" id="cookies-save">{{ c().save }}</button>
          <button type="button" class="btn btn-ghost" (click)="acceptAll()">
            {{ c().acceptAll }}
          </button>
          <button type="button" class="btn btn-ghost" (click)="necessary()">
            {{ c().onlyNecessary }}
          </button>
        </footer>
        <p class="more">
          <a [routerLink]="links.to('privacy')" (click)="close()">{{ c().more }}</a>
        </p>
      </form>
    </dialog>
  `,
  styles: `
    .bar {
      position: fixed;
      z-index: 95;
      left: clamp(12px, 2vw, 28px);
      bottom: clamp(12px, 2vw, 28px);
      width: min(560px, calc(100vw - 24px));
      display: grid;
      gap: 16px;
      padding: 20px 22px 22px;
      background: var(--white);
      border-top: 6px solid var(--timber);
      box-shadow: 0 18px 50px rgba(35, 42, 48, 0.28);
      font-size: 0.98rem;
      line-height: 1.5;
    }
    @media (prefers-reduced-motion: no-preference) {
      .bar {
        animation: bar-in 0.45s var(--ease) 0.6s backwards;
      }
    }
    @keyframes bar-in {
      from {
        opacity: 0;
        transform: translateY(18px);
      }
    }
    .actions,
    footer {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }
    .bar .btn {
      min-height: 44px;
    }

    .settings {
      width: min(600px, calc(100vw - 24px));
      max-height: calc(100dvh - 24px);
      padding: 0;
      border: 0;
      border-top: 6px solid var(--timber);
      background: var(--white);
      color: var(--slate);
      box-shadow: 0 30px 80px rgba(35, 42, 48, 0.4);
    }
    .settings::backdrop {
      background: rgba(35, 42, 48, 0.6);
    }
    form {
      display: grid;
      gap: 18px;
      padding: clamp(20px, 4vw, 32px);
    }
    header {
      display: flex;
      align-items: start;
      justify-content: space-between;
      gap: 16px;
    }
    .x {
      flex: none;
      display: grid;
      place-items: center;
      width: 44px;
      height: 44px;
      margin: -8px -8px 0 0;
      border: 0;
      background: none;
      color: var(--slate);
      cursor: pointer;
    }
    .x:hover {
      color: var(--timber);
    }
    .intro {
      color: var(--slate-2);
    }
    .kinds {
      display: grid;
      margin: 0;
      padding: 0;
      list-style: none;
      border-bottom: 1px solid var(--line-strong);
    }
    .kinds li {
      padding: 14px 0;
      border-top: 1px solid var(--line-strong);
    }
    .check > span {
      display: grid;
      gap: 2px;
    }
    .check strong {
      font-size: 1.05rem;
    }
    .check em {
      font-style: normal;
      font-size: 0.88rem;
      font-weight: 700;
      color: var(--spruce);
    }
    .check span span {
      color: var(--slate-2);
      font-size: 0.95rem;
    }
    .check input:disabled {
      opacity: 0.6;
    }
    .more {
      font-size: 0.95rem;
    }
    @media (max-width: 520px) {
      .bar {
        left: 0;
        right: 0;
        bottom: 0;
        width: auto;
        padding: 16px var(--gutter) 18px;
      }
      .bar .btn,
      footer .btn {
        flex: 1 1 auto;
      }
    }
  `,
})
export class CookieConsent {
  protected readonly consent = inject(Consent);
  protected readonly links = inject(Links);
  protected readonly t = inject(I18n).t;
  protected readonly c = () => this.t().cookies;
  protected readonly checked = checkedOf;
  private readonly toasts = inject(Toasts);

  /** Whether the site uses hCaptcha at all; without it there is no third kind to choose. */
  protected readonly hasExternal = signal(false);
  protected readonly preferences = signal(false);
  protected readonly external = signal(false);

  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  constructor() {
    inject(Api)
      .config()
      .then((c) => this.hasExternal.set(!!c.hcaptcha_sitekey))
      .catch(() => undefined);

    effect(() => {
      const open = this.consent.settingsOpen();
      const dialog = this.dialog().nativeElement;
      untracked(() => {
        if (open && !dialog.open) {
          this.preferences.set(this.consent.preferences());
          this.external.set(this.consent.external());
          dialog.showModal();
        } else if (!open && dialog.open) {
          dialog.close();
        }
      });
    });
  }

  protected acceptAll(): void {
    this.consent.save({ preferences: true, external: this.hasExternal() });
    this.done();
  }

  protected necessary(): void {
    this.consent.necessaryOnly();
    this.done();
  }

  protected save(event: Event): void {
    event.preventDefault();
    this.consent.save({
      preferences: this.preferences(),
      external: this.hasExternal() && this.external(),
    });
    this.done();
  }

  protected close(): void {
    this.consent.settingsOpen.set(false);
  }

  /** A click on the dimmed page around the dialog closes it without saving. */
  protected backdrop(event: MouseEvent): void {
    if (event.target === this.dialog().nativeElement) this.close();
  }

  private done(): void {
    const wasOpen = this.consent.settingsOpen();
    this.close();
    if (wasOpen) this.toasts.show(this.c().saved);
  }
}
