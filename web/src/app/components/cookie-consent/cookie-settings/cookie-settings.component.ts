import type { ElementRef } from '@angular/core';
import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '@components/icon/icon.component';
import type { ConsentChoice } from '@services/consent.service';
import { I18nService } from '@services/i18n.service';
import { LinksService } from '@services/links.service';
import { CookieKindComponent } from './cookie-kind/cookie-kind.component';

@Component({
  selector: 'rc-cookie-settings',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent, CookieKindComponent],
  templateUrl: './cookie-settings.component.html',
  styleUrl: './cookie-settings.component.scss',
})
export class CookieSettingsComponent {
  /** Opens the dialog as a modal; closing it emits `closed`. */
  readonly open = input.required<boolean>();
  /** The visitor's stored choice; the checkboxes start from it each time the dialog opens. */
  readonly choice = input.required<ConsentChoice>();
  /** Offers the third-party kind (hCaptcha); hidden when the site does not use it. */
  readonly hasExternal = input(false);
  /** The visitor saved the ticked kinds. */
  readonly save = output<ConsentChoice>();
  /** The visitor allowed everything. */
  readonly accept = output<void>();
  /** The visitor allowed only what the site needs to work. */
  readonly necessary = output<void>();
  /** The dialog was closed without a choice (button, Escape or a click outside). */
  readonly closed = output<void>();

  protected readonly t = inject(I18nService).t;
  protected readonly links = inject(LinksService);
  protected readonly preferences = signal(false);
  protected readonly external = signal(false);

  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  constructor() {
    effect(() => {
      const open = this.open();
      const dialog = this.dialog().nativeElement;
      untracked(() => {
        if (open && !dialog.open) {
          this.preferences.set(this.choice().preferences);
          this.external.set(this.choice().external);
          dialog.showModal();
        } else if (!open && dialog.open) {
          dialog.close();
        }
      });
    });
  }

  protected submit(event: Event): void {
    event.preventDefault();
    this.save.emit({
      preferences: this.preferences(),
      external: this.hasExternal() && this.external(),
    });
  }

  protected backdrop(event: MouseEvent): void {
    if (event.target === this.dialog().nativeElement) this.closed.emit();
  }
}
